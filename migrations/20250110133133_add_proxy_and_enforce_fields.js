/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.table('jobs', function(table) {
        table.string('proxy');  // Assuming proxy is a string. Adjust the type if necessary.
        table.boolean('enforce_update_fetched_data').defaultTo(false);  // Adds a boolean with a default value.
      });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.table('jobs', function(table) {
        table.dropColumn('proxy');
        table.dropColumn('enforce_update_fetched_data');
      });
};
