import readline from "readline";

export const genres = [
  "AI",
  "Machine Learning",
  "Generative AI",
  "Frontend",
  "Backend",
  "System Design",
  "Cloud",
];

export const getTopic = (): string => {
  if (process.env.TOPIC) {
    return process.env.TOPIC;
  }

  const randomGenre = genres[Math.floor(Math.random() * genres.length)];
  console.log(`No specific TOPIC provided. Randomly selected genre: ${randomGenre}`);
  return randomGenre;
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
