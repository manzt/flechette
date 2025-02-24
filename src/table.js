/**
 * A table consists of a collection of named columns (or 'children').
 * To work with table data directly in JavaScript, usse `toColumns()`
 * to extract an object that maps column names to extracted value arrays,
 * or `toArray()` to extract an array of row objects. For random access
 * by row index, use `getChild()` to access data for a specific column.
 */
export class Table {
  /**
   * Create a new table with the given schema and columns (children).
   * @param {import('./types.js').Schema} schema The table schema.
   * @param {import('./column.js').Column[]} children The table columns.
   */
  constructor(schema, children) {
    /** @readonly */
    this.schema = schema;
    /** @readonly */
    this.names = schema.fields.map(f => f.name);
    /**
     * @type {import('./column.js').Column[]}
     * @readonly
     */
    this.children = children;
  }

  /**
   * Provide an informative object string tag.
   */
  get [Symbol.toStringTag]() {
    return 'Table';
  }

  /**
   * The number of columns in this table.
   * @return {number} The number of columns.
   */
  get numCols() {
    return this.names.length;
  }

  /**
   * The number of rows in this table.
   * @return {number} The number of rows.
   */
  get numRows() {
    return this.children[0]?.length ?? 0;
  }

  /**
   * Return the child column at the given index position.
   * @param {number} index The column index.
   * @returns {import('./column.js').Column<any>}
   */
  getChildAt(index) {
    return this.children[index];
  }

  /**
   * Return the first child column with the given name.
   * @param {string} name The column name.
   * @returns {import('./column.js').Column<any>}
   */
  getChild(name) {
    const i = this.names.findIndex(x => x === name);
    return i > -1 ? this.children[i] : undefined;
  }

  /**
   * Construct a new table containing only columns at the specified indices.
   * The order of columns in the new table matches the order of input indices.
   * @param {number[]} indices The indices of columns to keep.
   * @param {string[]} [as] Optional new names for selected columns.
   * @returns {Table} A new table with columns at the specified indices.
   */
  selectAt(indices, as = []) {
    const { children, schema } = this;
    const { fields } = schema;
    return new Table(
      {
        ...schema,
        fields: indices.map((i, j) => renameField(fields[i], as[j]))
      },
      indices.map(i => children[i])
    );
  }

  /**
   * Construct a new table containing only columns with the specified names.
   * If columns have duplicate names, the first (with lowest index) is used.
   * The order of columns in the new table matches the order of input names.
   * @param {string[]} names Names of columns to keep.
   * @param {string[]} [as] Optional new names for selected columns.
   * @returns {Table} A new table with columns matching the specified names.
   */
  select(names, as) {
    const all = this.names;
    const indices = names.map(name => all.indexOf(name));
    return this.selectAt(indices, as);
  }

  /**
   * Return an object mapping column names to extracted value arrays.
   * @returns {Record<string, import('./types.js').ValueArray<any>>}
   */
  toColumns() {
    const { children, names } = this;
    /** @type {Record<string, import('./types.js').ValueArray<any>>} */
    const cols = {};
    names.forEach((name, i) => cols[name] = children[i]?.toArray() ?? [] );
    return cols;
  }

  /**
   * Return an iterator over objects representing the rows of this table.
   * @returns {Generator<Record<string, any>, any, null>}
   */
  *[Symbol.iterator]() {
    const { children, names } = this;
    const batches = children[0]?.data.length ?? 0;
    // for each batch...
    for (let b = 0; b < batches; ++b) {
      const data = children.map(c => c.data[b]);
      const rows = data[0].length;
      // for each row...
      for (let i = 0; i < rows; ++i) {
        yield rowObject(names, data, i);
      }
    }
  }

  /**
   * Return an array of objects representing the rows of this table.
   * @returns {Record<string, any>[]}
   */
  toArray() {
    const { children, numRows, names } = this;
    const batches = children[0]?.data.length ?? 0;
    const output = Array(numRows);
    // for each batch...
    for (let b = 0, row = -1; b < batches; ++b) {
      const data = children.map(c => c.data[b]);
      const rows = data?.[0].length;
      // for each row...
      for (let i = 0; i < rows; ++i) {
        output[++row] = rowObject(names, data, i);
      }
    }
    return output;
  }
}

function renameField(field, name) {
  return (name != null && name !== field.name)
    ? { ...field, name }
    : field;
}

function rowObject(names, data, index) {
  const o = {};
  // for each column...
  for (let j = 0; j < names.length; ++j) {
    o[names[j]] = data[j].at(index);
  }
  return o;
}
