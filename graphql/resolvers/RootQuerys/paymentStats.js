module.exports = async (_, args, {pgdb}) => {
  const paymentMethods = (await pgdb.query(`
    SELECT
      method,
      count(*) AS count
    FROM payments
    GROUP BY 1
    ORDER BY 2 DESC
  `)).map(async (datum) => {
    if (datum.method === 'PAYMENTSLIP') {
      const numPaperInvoice = await pgdb.queryOneField(`
        SELECT
          count(*)
        FROM payments
        WHERE
          method = 'PAYMENTSLIP'
          AND "paperInvoice" = true
      `)
      datum.details = [
        { detail: 'paperInvoice',
          count: numPaperInvoice }
      ]
    } else {
      datum.details = []
    }
    return datum
  })
  return {paymentMethods}
}
