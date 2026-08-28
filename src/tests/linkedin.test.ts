import { publishLinkedInPost } from "@/modules/linkedin";
import axios from "axios";

jest.mock("axios");

describe("publishLinkedInPost", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("success call with x-restli-id", async () => {
    (axios.post as jest.Mock).mockResolvedValue({
      status: 201,
      headers: {
        "x-restli-id": "urn:li:share:12345",
      },
    });

    const result = await publishLinkedInPost("Hello LinkedIn", "mock-token", "mock-urn");
    expect(result.postUrl).toBe("https://www.linkedin.com/feed/update/urn:li:share:12345");
    expect(result.error).toBeUndefined();
    expect(axios.post).toHaveBeenCalledWith(
      "https://api.linkedin.com/v2/ugcPosts",
      expect.objectContaining({
        lifecycleState: "PUBLISHED",
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer mock-token",
        }),
      })
    );
  });

  test("failure handling for non-201 response", async () => {
    (axios.post as jest.Mock).mockRejectedValue({
      response: {
        status: 400,
        data: "Invalid URN parameter",
      },
      message: "Request failed with status code 400",
    });

    const result = await publishLinkedInPost("Hello LinkedIn", "mock-token", "mock-urn");
    expect(result.postUrl).toBeUndefined();
    expect(result.error).toContain("LinkedIn API error: 400 - \"Invalid URN parameter\"");
  });

  test("connection error handling", async () => {
    (axios.post as jest.Mock).mockRejectedValue(new Error("DNS resolution failed"));

    const result = await publishLinkedInPost("Hello LinkedIn", "mock-token", "mock-urn");
    expect(result.postUrl).toBeUndefined();
    expect(result.error).toBe("LinkedIn API error: undefined - DNS resolution failed");
  });
});
