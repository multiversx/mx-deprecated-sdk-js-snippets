export class Breadcrumb {
    static CreateTable = `
CREATE TABLE "breadcrumb" (
    "id" INTEGER PRIMARY KEY ASC, 
    "scope" TEXT,
    "type" TEXT,
    "name" TEXT,
    "payload" TEXT
);`;

    static GetByScopeAndName = `SELECT * FROM "breadcrumb" WHERE "scope" = @scope AND "name" = @name`;
    static GetByScopeAndType = `SELECT * FROM "breadcrumb" WHERE "scope" = @scope AND "type" = @type`;
    static Insert = `INSERT INTO "breadcrumb" ("scope", "type", "name", "payload") VALUES (@scope, @type, @name, @payload)`;
    static UpdateSetPayload = `UPDATE "breadcrumb" SET "payload" = @payload WHERE "id" = @id`;
}

export class Interaction {
    static CreateTable = `
CREATE TABLE "interaction" (
    "id" INTEGER PRIMARY KEY ASC, 
    "scope" TEXT,
    "action" TEXT,
    "user" TEXT,
    "contract" TEXT,
    "transaction" TEXT,
    "timestamp" TEXT,
    "round" INTEGER,
    "epoch" INTEGER,
    "block_nonce" INTEGER,
    "hyperblock_nonce" INTEGER,
    "input" TEXT,
    "transfers" TEXT,
    "output" TEXT
);`;


    static Insert = `
INSERT INTO "interaction" (
    "scope", "action", "user", "contract", "transaction", 
    "timestamp", "round", "epoch", "block_nonce", "hyperblock_nonce", 
    "input", "transfers", "output"
) 
VALUES (
    @scope, @action, @user, @contract, @transaction, 
    @timestamp, @round, @epoch, @blockNonce, @hyperblockNonce, 
    @input, @transfers, @output
);`

    static UpdateSetOutput = `UPDATE "interaction" SET "output" = @output WHERE "id" = @id`;
}

export class AccountSnapshot {
    static CreateTable = `
CREATE TABLE "account_snapshot" (
    "id" INTEGER PRIMARY KEY ASC, 
    "scope" TEXT,
    "timestamp" TEXT,
    "address" TEXT,
    "nonce" NUMBER,
    "balance" TEXT,
    "tokens" TEXT,
    "taken_before_interaction" NUMBER NULL,
    "taken_after_interaction" NUMBER NULL,

    FOREIGN KEY("taken_before_interaction") REFERENCES "interaction"("id"),
    FOREIGN KEY("taken_after_interaction") REFERENCES "interaction"("id")
);`;

    static Insert = `
INSERT INTO "account_snapshot" (
    "scope", "timestamp", "address", "nonce", "balance", "tokens", 
    "taken_before_interaction", "taken_after_interaction"
)
VALUES (
    @scope, @timestamp, @address, @nonce, @balance, @tokens, 
    @takenBeforeInteraction, @takenAfterInteraction
);`;
}

export class GeneratedUser {
    static CreateTable = `
CREATE TABLE "generated_user" (
    "id" INTEGER PRIMARY KEY ASC, 
    "name" TEXT,
    "group" TEXT,
    "address" TEXT,
    "secret_key" TEXT
);`;

    static Insert = `
INSERT INTO "generated_user" (
    "name", "group", "address", "secret_key"
)
VALUES (
    @name, @group, @address, @secretKey
);`;
}


export class Log {
    static CreateTable = `
CREATE TABLE "log" (
    "id" INTEGER PRIMARY KEY ASC, 
    "scope" TEXT,
    "timestamp" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "event" TEXT,
    "summary" TEXT,
    "payload" TEXT,
    "interaction" NUMBER NULL,

    FOREIGN KEY("interaction") REFERENCES "interaction"("id")
);`;

    static Insert = `
INSERT INTO "log" (
    "scope", "event", "summary", "payload"
)
VALUES (
    @scope, @event, @summary, @payload
);`;
}
