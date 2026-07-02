import readline from "readline";

export const getTopic = (): string => {
  console.log("No specific TOPIC provided. Falling back to default: software engineering");
  return "software engineering";
};

export const askQuestion = (query: string): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
};
