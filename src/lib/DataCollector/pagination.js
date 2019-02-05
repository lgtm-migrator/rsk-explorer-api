import { OBJECT_ID } from '../../lib/types'
import { ObjectID } from 'mongodb'

export const MIN_LIMIT = 10
export const MAX_LIMIT = 300

export function generateCursorQuery ({ cursorField, sortDir, value }) {
  const op = (sortDir === -1) ? '$lt' : '$gt'
  return (value) ? { [cursorField]: { [op]: value } } : null
}

export function formatSearchValue (type, value) {
  if (value !== null && value !== undefined) {
    if (type === 'number') value = parseInt(value)
    if (type === OBJECT_ID) value = new ObjectID(value)
  }
  return value
}

export function generateSort ({ cursorField, sort, sortDir }) {
  // uncomplete
  // sortDir = sort[cursorField] ? sort[cursorField] : sortDir
  //delete sort[cursorField]
  //let cSort = (Object.entries(sort).length > 0) ? sort : {}
  let cSort = Object.assign({}, sort)
  cSort[cursorField] = sortDir
  return cSort
}

export function generateQuery (params, query = {}) {
  let cursorQuery = generateCursorQuery(params)
  if (!cursorQuery || Object.keys(cursorQuery) < 1) return query
  return (query && Object.keys(query).length > 0) ? { $and: [cursorQuery, query] } : cursorQuery
}

export function getLimit ({ limit }) {
  limit = limit || MIN_LIMIT
  if (limit > MAX_LIMIT) limit = MAX_LIMIT
  return limit
}

export function parseParams (cursorData, params) {
  params.sort = params.sort || {}
  const cursorField = cursorData.field
  const cursorType = cursorData.type
  let { sortDir, prev, next, sort } = params
  sortDir = (sortDir === 1) ? 1 : -1
  sortDir = (sort[cursorField]) ? sort[cursorField] : sortDir
  const limit = getLimit(params)
  let backwardNav = !!prev
  if (backwardNav) {
    sortDir = (sortDir === 1) ? -1 : 1
  }

  let value = (backwardNav) ? prev : next
  value = formatSearchValue(cursorType, value)
  params = Object.assign(params, { sortDir, backwardNav, value, limit, cursorField, cursorData })
  return params
}

export async function findPages (collection, cursorData, query, params) {
  try {
    params = parseParams(cursorData, params)
    const { limit } = params
    const $query = generateQuery(params, query)
    const $sort = generateSort(params)
    let data = await find(collection, $query, $sort, limit + 1)
    let total = (data.length) ? (await collection.countDocuments(query)) : null
    return paginationResponse(params, data, total)
  } catch (err) {
    return Promise.reject(err)
  }
}

export async function aggregatePages (collection, cursorData, query, params) {
  try {
    params = parseParams(cursorData, params)
    const { limit } = params
    let match = generateQuery(params)
    const sort = generateSort(params)
    let data = []
    const aggregate = modifyAggregate(query, { match, sort, limit: limit + 1 })
    console.log(JSON.stringify(aggregate))
    let cursor = await collection.aggregate(aggregate)
    data = await cursor.toArray()
    let total = (data.length) ? await getAggregateTotal(collection, query) : null
    return paginationResponse(params, data, total)
  } catch (err) {
    return Promise.reject(err)
  }
}

export function modifyAggregate (query, { match, sort, limit }) {
  let aggregate = [...query]
  let index = aggregate.findIndex(v => v.$match)
  index = (index > -1) ? index : aggregate.unshift(null)

  let mm = (aggregate[index]) ? aggregate[index].$match : null
  let $match = (mm) ? { $and: [match, mm] } : match
  aggregate[index] = { $match }
  index++

  if (sort) {
    aggregate.splice(index, 0, { $sort: sort })
    index++
  }

  if (limit) aggregate.splice(index, 0, { $limit: limit })
  return aggregate
}

export async function getAggregateTotal (collection, query) {
  const aggregate = [...query]
  try {
    aggregate.push({
      $group: { _id: 'result', total: { $sum: 1 } }
    })
    let res = await collection.aggregate(aggregate).toArray()
    return (res && res[0]) ? res[0].total : 0
  } catch (err) {
    return Promise.reject(err)
  }
}

export function paginationResponse (params, data, total) {
  total = total || null
  const { limit, cursorField } = params
  const hasMore = data.length > params.limit
  const hasPrevious = !!params.next || !!(params.prev && hasMore)

  if (params.prev) data.reverse()
  const prev = (hasPrevious) ? data[0][cursorField] : null

  if (hasMore) data.pop()
  const next = (!!params.prev || hasMore) ? data[data.length - 1][cursorField] : null
  const pagination = { limit, total, next, prev }
  return { pagination, data }
}

export async function find (collection, query, sort, limit, project) {
  sort = sort || {}
  project = project || {}
  limit = limit || 0
  let data = await collection
    .find(query)
    .project(project)
    .sort(sort)
    .limit(limit)
    .toArray()
    .catch((err) => {
      return Promise.reject(err)
    })
  return data
}
