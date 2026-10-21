// Level-1 test double for a Prisma interactive transaction. Records every raw
// statement (SQL text with ? placeholders + parameter values) and model call,
// and answers from scripted handlers. No database is touched.
export function fakeTx({ query = () => [], execute = () => 1, models = {} } = {}) {
  const calls = []
  const sqlOf = (strings) => strings.join('?').replace(/\s+/g, ' ').trim()
  const tx = {
    calls,
    raw: (pattern) => calls.filter((c) => c.kind !== 'model' && pattern.test(c.sql)),
    audits: () => calls.filter((c) => c.kind === 'model' && c.model === 'auditLog').map((c) => c.args.data),
    async $queryRaw(strings, ...values) {
      const sql = sqlOf(strings)
      calls.push({ kind: 'query', sql, values })
      return query(sql, values)
    },
    async $executeRaw(strings, ...values) {
      const sql = sqlOf(strings)
      calls.push({ kind: 'execute', sql, values })
      return execute(sql, values)
    },
  }
  const modelNames = new Set(['auditLog', ...Object.keys(models)])
  for (const model of modelNames) {
    tx[model] = new Proxy({}, {
      get: (target, method) => Object.hasOwn(target, method) ? target[method] : async (args) => {
        calls.push({ kind: 'model', model, method, args })
        const handler = models[model]?.[method]
        if (handler) return handler(args)
        if (model === 'auditLog' && method === 'create') return { id: 1n }
        throw new Error(`fakeTx: no handler for ${model}.${String(method)}`)
      },
    })
  }
  tx.$transaction = async (fn) => fn(tx)
  return tx
}
