/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.alterTable('User_data', function (table) {
        table.dropUnique('email'); // Remove the existing unique constraint
        table.unique(['email', 'platform']); // Add a new unique constraint for email + platform
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.alterTable('User_data', function (table) {
        table.dropUnique(['email', 'platform']); // Remove the new constraint if we rollback
        table.unique('email'); // Restore the original constraint
    });
};
