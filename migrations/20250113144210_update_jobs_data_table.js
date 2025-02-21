/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.table('jobs', function(table) {
        table.timestamp('last_time_run');
        table.integer('run_count').defaultTo(0);
      });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema
    .table('jobs', function (table) {
        table.dropColumn('last_time_run');
        table.dropColumn('run_count');
    });
};
