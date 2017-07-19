exports.dateRangeFilterWhere = (dateRangeFilter, prefix) => {
  if (!dateRangeFilter) { return '' }
  return `
    ${prefix || ''}
    ("${dateRangeFilter.field}" >= :fromDate AND
    "${dateRangeFilter.field}" <= :toDate)
  `
}

exports.stringArrayFilterWhere = (stringArrayFilter, prefix) => {
  if (!stringArrayFilter) { return '' }
  return `
    ${prefix || ''}
    ARRAY["${stringArrayFilter.field}"] && :stringArray
  `
}

exports.booleanFilterWhere = (booleanFilter, prefix) => {
  if (!booleanFilter) { return '' }
  return `
    ${prefix || ''}
    "${booleanFilter.field}" = :booleanValue
  `
}
