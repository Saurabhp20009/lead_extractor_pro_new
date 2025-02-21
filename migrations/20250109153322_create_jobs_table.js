/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.hasTable('jobs').then(function(exists) {
        if (!exists) {
            return knex.schema.createTable('jobs', (table) => {
                table.increments('id').primary();
                table.string('title');
                table.string('platforms');
                table.string('frequency');
                table.string('state');
                table.string('query');
                table.timestamp('timeCreated').defaultTo(knex.fn.now());
            });
        }
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTableIfExists('jobs');
};