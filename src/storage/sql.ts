export class Breadcrumb {
    static CreateTable = `
CREATE TABLE "breadcrumb" (
    "id" INTEGER PRIMARY KEY ASC,
    "correlation_step" TEXT,
    "correlation_tag" TEXT,
    "type" TEXT,
    "name" TEXT,
    "payload" TEXT
);`;

    static GetByName = `SELECT * FROM "breadcrumb" WHERE "name" = @name`;
    static GetByType = `SELECT * FROM "breadcrumb" WHERE "type" = @type`;
    static GetAll = `SELECT * FROM "breadcrumb"`;
    static Insert = `
INSERT INTO "breadcrumb" (
    "correlation_step", "correlation_tag", "type", "name", "payload"
) 
VALUES (
    @correlationStep, @correlationTag, @type, @name, @payload
)`;

    static Delete = `DELETE FROM "breadcrumb" WHERE "id" = @id`;
}

export class Audit {
    static CreateTable = `
CREATE TABLE "audit" (
    "id" INTEGER PRIMARY KEY ASC,
    "correlation_step" TEXT,
    "correlation_tag" TEXT,
    "timestamp" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "event" TEXT,
    "summary" TEXT,
    "payload" TEXT,
    "comparable_to" NUMBER NULL,

    FOREIGN KEY("comparable_to") REFERENCES "audit"("id")
);`;

    static GetAll = `SELECT * FROM "audit"`;
    static Insert = `
INSERT INTO "audit" (
    "correlation_step", "correlation_tag", "event", "summary", "payload", "comparable_to"
)
VALUES (
    @correlationStep, @correlationTag, @event, @summary, @payload, @comparableTo
);`;
}
