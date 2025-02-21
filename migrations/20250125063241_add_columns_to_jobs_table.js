/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.table('Jobs', function(table) {
        table.boolean('specific_username').defaultTo(false);
        table.string('last_scrapped_element').nullable();
      });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.table('Jobs', function(table) {
        table.dropColumn('specific_username');
        table.dropColumn('tracking_element');
      });
};
