exports.andFilters = (filters) => {
  return filters.filter(Boolean).join(' AND ')
}

exports.dateRangeFilterWhere = (dateRangeFilter) => {
  if (!dateRangeFilter) { return null }
  return `
    ("${dateRangeFilter.field}" >= :fromDate AND
    "${dateRangeFilter.field}" <= :toDate)
  `
}

exports.stringArrayFilterWhere = (stringArrayFilter) => {
  if (!stringArrayFilter) { return null }
  return `ARRAY["${stringArrayFilter.field}"] && :stringArray`
}

exports.booleanFilterWhere = (booleanFilter) => {
  if (!booleanFilter) { return null }
  return `"${booleanFilter.field}" = :booleanValue`
}
