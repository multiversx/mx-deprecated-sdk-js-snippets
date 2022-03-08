import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from "typeorm";
import { IReferenceOfInteractionWithinStorage } from "../interfaces";

@Entity({ name: "breadcrumb" })
export class BreadcrumbRecord {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    scope: string = "";

    @Column()
    type: string = "";

    @Column()
    name: string = "";

    @Column()
    payload: string = "";
}

@Entity({ name: "interaction" })
export class InteractionRecord {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    scope: string = "";

    @Column()
    action: string = "";

    @Column()
    user: string = "";

    @Column()
    contract: string = "";

    @Column()
    transaction: string = "";

    @Column()
    timestamp: string = "";

    @Column()
    round: number = 0;

    @Column()
    epoch: number = 0;

    @Column({ name: "block_nonce" })
    blockNonce: number = 0;

    @Column({ name: "hyperblock_nonce" })
    hyperblockNonce: number = 0;

    @Column()
    input: string = "";

    @Column()
    transfers: string = "";

    @Column()
    output: string = "";
}

@Entity({ name: "account_snapshot" })
export class AccountSnapshotRecord {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    scope: string = "";

    @Column()
    timestamp: string = "";

    @Column()
    address: string = "";

    @Column()
    nonce: number = 0;

    @Column()
    balance: string = "";

    @Column()
    tokens: string = "";

    @ManyToOne(() => InteractionRecord)
    @JoinColumn({ name: "taken_before_interaction" })
    takenBeforeInteraction?: InteractionRecord;

    @ManyToOne(() => InteractionRecord)
    @JoinColumn({ name: "taken_after_interaction" })
    takenAfterInteraction?: InteractionRecord;
}

class ReferenceOfRecord {
    readonly id;

    constructor(id: number) {
        this.id = id;
    }

    valueOf(): number {
        return this.id;
    }
}

export class ReferenceOfInteractionWithinStorage extends ReferenceOfRecord implements IReferenceOfInteractionWithinStorage {
    getRecord(): InteractionRecord {
        let record = new InteractionRecord();
        record.id = this.id;
        return record;
    }
}
