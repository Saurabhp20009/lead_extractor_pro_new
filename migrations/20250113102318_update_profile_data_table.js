/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.alterTable('Profile_Data', function(table) {
        table.string('phone').nullable().alter();
        table.string('email').nullable().alter();
      });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    table.string('phone').notNullable().alter();
    table.string('email').notNullable().alter()

};
