import Dexie, { IndexableType, Table } from "dexie";
import { Card } from "primeng/card";
import { Asset } from "../types/asset.type";
import { CardTemplate } from "../types/card-template.type";
import { Game } from "../types/game.type";
import { PrintTemplate } from "../types/print-template.type";
import { importInto, exportDB } from "dexie-export-import";
import * as FileSaver from "file-saver";
import FileUtils from "src/app/shared/utils/file-utils";
import { ExportProgress } from "dexie-export-import/dist/export";
import { ImportProgress } from "dexie-export-import/dist/import";


export class AppDB extends Dexie {
    private static readonly DB_NAME: string = 'cider-db';
    public static readonly GAMES_TABLE: string = 'games';
    public static readonly CARDS_TABLE: string = 'cards';
    public static readonly ASSETS_TABLE: string = 'assets';
    public static readonly CARD_TEMPLATES_TABLE: string = 'cardTemplates'
    public static readonly PRINT_TEMPLATES_TABLE: string = 'printTemplates';
    public static readonly CARD_ATTRIBUTES_TABLE: string = 'cardAttributes';

    games!: Table<Game, number>;
    cards!: Table<Card, number>;
    assets!: Table<Asset, number>;
    cardTemplates!: Table<CardTemplate, number>;
    printTemplates!: Table<PrintTemplate, number>;

    constructor() {
        super(AppDB.DB_NAME);
        this.version(1).stores({
            games: '++id, name',
            cards: '++id, gameId, count, frontCardTemplateId, backCardTemplateId',
            assets: '++id, gameId, name',
            cardTemplates: '++id, gameId, name, description, html, css',
            printTemplates: '++id, gameId, name, description, html, css',
            cardAttributes: '++id, gameId, name, type, options, description'
        });
        this.on('populate', () => this.populate());
    }

    async populate() {
        const gameId : IndexableType = await db.table(AppDB.GAMES_TABLE).add({
            name: 'Apple Cider Game'
        });

        const frontCardTemplateId : IndexableType = await db.table(AppDB.CARD_TEMPLATES_TABLE).add({
            name: 'Apple Front',
            gameId: gameId,
            description: '',
            css: templateCssFront,
            html: templateHtmlFront
        });

        const backCardTemplateId : IndexableType = await db.table(AppDB.CARD_TEMPLATES_TABLE).add({
            name: 'Apple Back',
            gameId: gameId,
            description: '',
            css: templateCssBack,
            html: templateHtmlBack
        });

        await db.table(AppDB.CARD_ATTRIBUTES_TABLE).bulkAdd([
            {
                gameId: gameId,
                name: 'Description',
                description: 'Description of the card'
            }, {
                gameId: gameId,
                name: 'Hue',
                description: 'Hue of the card'
            }
        ]);

        await db.table(AppDB.CARDS_TABLE).bulkAdd([
            {
                gameId: gameId,
                frontCardTemplateId: frontCardTemplateId,
                backCardTemplateId: backCardTemplateId,
                name: 'Poison Apple',
                count: 3,
                description: "Take one card from an opponent's hand.",
                hue: '110'
            }, {
                gameId: gameId,
                frontCardTemplateId: frontCardTemplateId,
                backCardTemplateId: backCardTemplateId,
                name: 'Healthy Apple',
                count: 1,
                description: "Take a card from the discard pile.",
                hue: '0'
            }, {
                gameId: gameId,
                frontCardTemplateId: frontCardTemplateId,
                backCardTemplateId: backCardTemplateId,
                name: 'Mystic Apple',
                count: 1,
                description: "Draw two cards from the deck, choose one, discard the other.",
                hue: '250'
            }, {
                gameId: gameId,
                frontCardTemplateId: frontCardTemplateId,
                backCardTemplateId: backCardTemplateId,
                name: 'Crystal Apple',
                count: 1,
                description: "Every player draws a card and hands you one card from their hand.",
                hue: '175'
            }
        ]);
    }

    /**
     * Import database from file
     * Warning: Overrides the existing database
     * 
     * @param file 
     */
    public importDatabase(file: File, progressCallback?: (progress: ImportProgress) => boolean): Promise<boolean> {
        // unsolved dexie with typescript issue: https://github.com/dexie/Dexie.js/issues/1262
        // @ts-ignore
        return importInto(db, file, {
            overwriteValues: true,
            noTransaction: true,
            progressCallback: progressCallback
        }).then(result => true);
    }

    /**
     * Export database to file
     * 
     */
    public exportDatabase(progressCallback?: (progress: ExportProgress) => boolean): Promise<boolean> {
        // unsolved dexie with typescript issue: https://github.com/dexie/Dexie.js/issues/1262
        // @ts-ignore
        const promisedBlob: Promise<Blob> = exportDB(this, {progressCallback: progressCallback});
        return promisedBlob.then(blob => {
            FileUtils.saveAs(blob, 'database.json');
            return true;
        });
    }

    /**
     * Delete all data in database and return to default data.
     */
    public resetDatabase() {
        return db.delete().then (()=>db.open());
    }
}


const templateCssFront  = 
`.card {
    width: 825px;
    height: 1125px;
    border-radius: 25px;
    text-align: center;
    display: flex;
    flex-direction: column;
    background-color: hsl({{card.hue}}, 23%, 40%);
    border: 45px solid hsl({{card.hue}}, 23%, 30%);
    color: hsl({{card.hue}}, 23%, 90%);
    font-weight: 600;
    font-size: 50px;
}
.card .header {
    height: 300px;
    font-size: 80px;
    font-weight: 600;
    padding: 10px;
    padding-top: 60px;
}
.card .apple {
    height: 250px;
    font-size: 150px;
}
.card .content {
    flex: 1;
    padding: 50px;
    padding-top: 60px;
}
.card .footer {
    height: 200px;
    text-align: right;
    padding: 100px;
    padding-right: 50px;
}`;

const templateHtmlFront = 
`<div class="card">
    <div class="header">{{card.name}}</div>
    <div class="apple">◯</div>
    <div class="content">{{card.description}}</div>
    <div class="footer">A{{#padZeros card.id 3}}{{/padZeros}}</div>
</div>`;

const templateCssBack =
`.card {
    width: 825px;
    height: 1125px;
    border-radius: 25px;
    text-align: center;
    display: flex;
    flex-direction: column;
    background-color: hsl(220, 24%, 30%);
    border: 45px solid hsl(220, 23%, 10%);
    color: hsl(220, 23%, 70%);
    font-weight: 600;
    font-size: 100px;
}
.card .content {
    flex: 1;
    padding: 50px;
    padding-top: 350px;
}`

const templateHtmlBack =
`<div class="card">
    <div class="content">Apple Cider Game</div>
</div>`

export const db = new AppDB();
