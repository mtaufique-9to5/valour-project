// Interactive terminal prompts for the admin CLI scripts. Hidden prompts never
// echo what is typed, and nothing typed is written to logs or files.
import readline from 'node:readline'

export function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    if (hidden) {
      rl._writeToOutput = (s) => {
        if (s.startsWith(question)) rl.output.write(question)
        else if (s.includes('\n') || s.includes('\r')) rl.output.write('\n')
      }
    }
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer)
    })
  })
}

export async function askNewPassword(email, passwordProblems) {
  for (;;) {
    const password = await ask('New password: ', { hidden: true })
    const problems = passwordProblems(password, { email })
    if (problems.length) { console.error(problems.join(' ')); continue }
    if ((await ask('Repeat password: ', { hidden: true })) !== password) { console.error('Passwords do not match.'); continue }
    return password
  }
}
