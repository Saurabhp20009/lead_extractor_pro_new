/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
return knex.schema.createTable('Profile_Data', function(table) {
    table.increments('id').primary();
    table.integer('job_id').notNullable();
    table.integer('query_id').notNullable();
    table.string('name').notNullable();
    table.string('source').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.string('email').Nullable();
    table.string('phone').Nullable();
    table.text('links');
});
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTable('Profile_data');
};
