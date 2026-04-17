import bcrypt from "bcrypt";

export function escapeForDockerCompose(hash) {
  return hash.split("$").join("$$");
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const password = process.argv[2];
  if (!password) {
    console.error("Usage: npm run docker:hash-password <password>");
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, 10);
  console.log(escapeForDockerCompose(hash));
}
