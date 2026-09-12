import {
  BaseCheckpointSaver,
  type Checkpoint,
  type CheckpointListOptions,
  type CheckpointMetadata,
  type CheckpointTuple,
  type PendingWrite,
  getCheckpointId,
} from "@langchain/langgraph-checkpoint";
import type { RunnableConfig } from "@langchain/core/runnables";
import { supabase } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import type { Database, Json } from "@/types/database.types";

const log = logger.child({ module: "SupabaseCheckpointer" });

function jsonToString(val: Json): string {
  return typeof val === "string" ? val : JSON.stringify(val);
}

/**
 * PostgreSQL / Supabase checkpointer for LangGraph.
 * Persists graph state threads and checkpoints directly in Supabase tables.
 */
export class SupabaseCheckpointer extends BaseCheckpointSaver {
  async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
    if (!supabase) return undefined;

    const thread_id = config.configurable?.thread_id;
    if (!thread_id) return undefined;

    const checkpoint_ns = config.configurable?.checkpoint_ns ?? "";
    const checkpoint_id = getCheckpointId(config);

    try {
      let query = supabase
        .from("agent_checkpoints")
        .select("*")
        .eq("thread_id", thread_id);

      if (checkpoint_id) {
        query = query.eq("checkpoint_id", checkpoint_id);
      } else {
        query = query.order("created_at", { ascending: false }).limit(1);
      }

      const { data, error } = await query;
      if (error) {
        log.warn("Failed to fetch checkpoint from Supabase", { error: error.message, thread_id });
        return undefined;
      }

      if (!data || data.length === 0) {
        return undefined;
      }

      const row = data[0];
      const deserializedCheckpoint = (await this.serde.loadsTyped(
        "json",
        jsonToString(row.checkpoint_json)
      )) as Checkpoint;

      const deserializedMetadata = row.metadata_json
        ? ((await this.serde.loadsTyped(
            "json",
            jsonToString(row.metadata_json)
          )) as CheckpointMetadata)
        : undefined;

      // Fetch associated pending writes
      const { data: writesData, error: writesError } = await supabase
        .from("agent_checkpoint_writes")
        .select("*")
        .eq("thread_id", thread_id)
        .eq("checkpoint_id", row.checkpoint_id)
        .order("idx", { ascending: true });

      let pendingWrites: [string, string, unknown][] = [];
      if (!writesError && writesData) {
        pendingWrites = await Promise.all(
          writesData.map(async (w): Promise<[string, string, unknown]> => [
            w.task_id,
            w.channel,
            w.value_json
              ? await this.serde.loadsTyped("json", jsonToString(w.value_json))
              : null,
          ])
        );
      }

      const tuple: CheckpointTuple = {
        config: {
          configurable: {
            thread_id,
            checkpoint_ns,
            checkpoint_id: row.checkpoint_id,
          },
        },
        checkpoint: deserializedCheckpoint,
        metadata: deserializedMetadata,
        pendingWrites: pendingWrites as CheckpointTuple["pendingWrites"],
      };

      if (row.parent_id) {
        tuple.parentConfig = {
          configurable: {
            thread_id,
            checkpoint_ns,
            checkpoint_id: row.parent_id,
          },
        };
      }

      return tuple;
    } catch (err: unknown) {
      log.error("Exception fetching checkpoint tuple", {
        error: err instanceof Error ? err.message : String(err),
      });
      return undefined;
    }
  }

  async *list(
    config: RunnableConfig,
    options?: CheckpointListOptions
  ): AsyncGenerator<CheckpointTuple> {
    if (!supabase) return;

    const thread_id = config.configurable?.thread_id;
    if (!thread_id) return;

    const checkpoint_ns = config.configurable?.checkpoint_ns ?? "";
    const { limit } = options ?? {};

    try {
      let query = supabase
        .from("agent_checkpoints")
        .select("*")
        .eq("thread_id", thread_id)
        .order("created_at", { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;
      if (error || !data) return;

      for (const row of data) {
        const deserializedCheckpoint = (await this.serde.loadsTyped(
          "json",
          jsonToString(row.checkpoint_json)
        )) as Checkpoint;

        const deserializedMetadata = row.metadata_json
          ? ((await this.serde.loadsTyped(
              "json",
              jsonToString(row.metadata_json)
            )) as CheckpointMetadata)
          : undefined;

        yield {
          config: {
            configurable: {
              thread_id,
              checkpoint_ns,
              checkpoint_id: row.checkpoint_id,
            },
          },
          checkpoint: deserializedCheckpoint,
          metadata: deserializedMetadata,
        };
      }
    } catch (err: unknown) {
      log.error("Exception in checkpoint list generator", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async put(
    config: RunnableConfig,
    checkpoint: Checkpoint,
    metadata: CheckpointMetadata,
    _newVersions: Record<string, number | string>
  ): Promise<RunnableConfig> {
    void _newVersions;
    if (!supabase) return config;

    const thread_id = config.configurable?.thread_id;
    if (!thread_id) return config;

    const user_id = (config.configurable?.userId as string) || null;
    const checkpoint_ns = config.configurable?.checkpoint_ns ?? "";
    const parent_id = config.configurable?.checkpoint_id || null;

    try {
      const [, checkpointBytes] = await this.serde.dumpsTyped(checkpoint);
      const [, metadataBytes] = await this.serde.dumpsTyped(metadata);

      const checkpointStr = new TextDecoder().decode(checkpointBytes);
      const metadataStr = new TextDecoder().decode(metadataBytes);

      const checkpointJson = JSON.parse(checkpointStr) as Json;
      const metadataJson = JSON.parse(metadataStr) as Json;

      const record: Record<string, unknown> = {
        thread_id,
        checkpoint_id: checkpoint.id,
        parent_id,
        checkpoint_json: checkpointJson,
        metadata_json: metadataJson,
        created_at: new Date().toISOString(),
      };
      if (user_id) {
        record.user_id = user_id;
      }

      let { error } = await supabase.from("agent_checkpoints").upsert(
        record as unknown as Database["public"]["Tables"]["agent_checkpoints"]["Insert"],
        { onConflict: "thread_id,checkpoint_id" }
      );

      // Graceful backwards-compatibility if user_id column not yet migrated in remote database
      if (error && error.message?.includes("user_id")) {
        delete record.user_id;
        const retry = await supabase.from("agent_checkpoints").upsert(
          record as unknown as Database["public"]["Tables"]["agent_checkpoints"]["Insert"],
          { onConflict: "thread_id,checkpoint_id" }
        );
        error = retry.error;
      }

      if (error) {
        log.error("Failed to persist checkpoint to Supabase", {
          error: error.message,
          thread_id,
          checkpoint_id: checkpoint.id,
        });
      }
    } catch (err: unknown) {
      log.error("Exception putting checkpoint", {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return {
      configurable: {
        thread_id,
        checkpoint_ns,
        checkpoint_id: checkpoint.id,
      },
    };
  }

  async putWrites(
    config: RunnableConfig,
    writes: PendingWrite[],
    taskId: string
  ): Promise<void> {
    if (!supabase) return;

    const thread_id = config.configurable?.thread_id;
    const checkpoint_id = config.configurable?.checkpoint_id;
    const user_id = (config.configurable?.userId as string) || null;
    if (!thread_id || !checkpoint_id) return;

    try {
      const rows = await Promise.all(
        writes.map(async ([channel, value], idx) => {
          let valueJson: Json = null;
          if (value !== undefined) {
            const [, valueBytes] = await this.serde.dumpsTyped(value);
            valueJson = JSON.parse(new TextDecoder().decode(valueBytes)) as Json;
          }

          const rowRecord: Record<string, unknown> = {
            thread_id,
            checkpoint_id,
            task_id: taskId,
            idx,
            channel,
            type: typeof value,
            value_json: valueJson,
            created_at: new Date().toISOString(),
          };
          if (user_id) {
            rowRecord.user_id = user_id;
          }
          return rowRecord;
        })
      );

      let { error } = await supabase.from("agent_checkpoint_writes").upsert(
        rows as unknown as Database["public"]["Tables"]["agent_checkpoint_writes"]["Insert"][],
        { onConflict: "thread_id,checkpoint_id,task_id,idx" }
      );

      // Graceful backwards-compatibility if user_id column not yet migrated in remote database
      if (error && error.message?.includes("user_id")) {
        const fallbackRows = rows.map((r) => {
          const rest = { ...r };
          delete (rest as { user_id?: string }).user_id;
          return rest;
        });

        const retry = await supabase.from("agent_checkpoint_writes").upsert(
          fallbackRows as unknown as Database["public"]["Tables"]["agent_checkpoint_writes"]["Insert"][],
          { onConflict: "thread_id,checkpoint_id,task_id,idx" }
        );
        error = retry.error;
      }

      if (error) {
        log.error("Failed to persist checkpoint writes to Supabase", {
          error: error.message,
          thread_id,
          checkpoint_id,
        });
      }
    } catch (err: unknown) {
      log.error("Exception putting checkpoint writes", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async deleteThread(threadId: string): Promise<void> {
    if (!supabase) return;
    try {
      await supabase.from("agent_checkpoint_writes").delete().eq("thread_id", threadId);
      await supabase.from("agent_checkpoints").delete().eq("thread_id", threadId);
      log.info("Deleted thread checkpoints from Supabase", { threadId });
    } catch (err: unknown) {
      log.error("Exception deleting thread checkpoints", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
