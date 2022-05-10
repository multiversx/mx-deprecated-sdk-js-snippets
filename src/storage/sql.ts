export class Breadcrumb {
    static CreateTable = `
CREATE TABLE "breadcrumb" (
    "id" INTEGER PRIMARY KEY ASC, 
    "type" TEXT,
    "name" TEXT,
    "payload" TEXT
);`;

    static GetByName = `SELECT * FROM "breadcrumb" WHERE AND "name" = @name`;
    static GetByType = `SELECT * FROM "breadcrumb" WHERE AND "type" = @type`;
    static GetAll = `SELECT * FROM "breadcrumb"`;
    static Insert = `INSERT INTO "breadcrumb" ("type", "name", "payload") VALUES (@type, @name, @payload)`;
    static UpdateSetPayload = `UPDATE "breadcrumb" SET "payload" = @payload WHERE "id" = @id`;
}

export class Interaction {
    static CreateTable = `
CREATE TABLE "interaction" (
    "id" INTEGER PRIMARY KEY ASC, 
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
    "action", "user", "contract", "transaction", 
    "timestamp", "round", "epoch", "block_nonce", "hyperblock_nonce", 
    "input", "transfers", "output"
) 
VALUES (
    @action, @user, @contract, @transaction, 
    @timestamp, @round, @epoch, @blockNonce, @hyperblockNonce, 
    @input, @transfers, @output
);`

    static UpdateSetOutput = `UPDATE "interaction" SET "output" = @output WHERE "id" = @id`;
}

export class AccountSnapshot {
    static CreateTable = `
CREATE TABLE "account_snapshot" (
    "id" INTEGER PRIMARY KEY ASC, 
    "timestamp" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "address" TEXT,
    "nonce" NUMBER,
    "balance" TEXT,
    "fungible_tokens" TEXT,
    "non_fungible_tokens" TEXT,
    "taken_before_interaction" NUMBER NULL,
    "taken_after_interaction" NUMBER NULL,

    FOREIGN KEY("taken_before_interaction") REFERENCES "interaction"("id"),
    FOREIGN KEY("taken_after_interaction") REFERENCES "interaction"("id")
);`;

    static Insert = `
INSERT INTO "account_snapshot" (
    "address", "nonce", "balance", "fungible_tokens", "non_fungible_tokens", 
    "taken_before_interaction", "taken_after_interaction"
)
VALUES (
    @address, @nonce, @balance, @fungibleTokens, @nonFungibleTokens, 
    @takenBeforeInteraction, @takenAfterInteraction
);`;
}

export class Log {
    static CreateTable = `
CREATE TABLE "log" (
    "id" INTEGER PRIMARY KEY ASC, 
    "timestamp" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "event" TEXT,
    "summary" TEXT,
    "payload" TEXT,
    "interaction" NUMBER NULL,

    FOREIGN KEY("interaction") REFERENCES "interaction"("id")
);`;

    static Insert = `
INSERT INTO "log" (
    "event", "summary", "payload"
)
VALUES (
    @event, @summary, @payload
);`;
}
