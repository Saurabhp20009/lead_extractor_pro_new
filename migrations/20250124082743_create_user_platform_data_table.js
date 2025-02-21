/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('User_data', function(table) {
        table.increments('id').primary();
        table.string('email', 255).notNullable().unique(); // Email with unique constraint
        table.string('password', 255).notNullable(); // For storing hashed passwords
        table.string('platform').notNullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
      });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  
};
