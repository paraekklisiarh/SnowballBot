import { IModule } from "../../types/ModuleLoader";
import { Plugin } from "../plugin";
import { Message, TextChannel } from "discord.js";
import { getDB } from "../utils/db";
import { convertNumbers } from "../utils/letters";
import * as knex from "knex";
import * as logger from "loggy";

class Count extends Plugin implements IModule {
	public get signature() {
		return "dafri.interactive.count";
	}

	log: Function = logger("CountChannel");
	dbClient: knex;
	countRegex: RegExp;
	dbInitialized: boolean = false;

	constructor() {
		super({
			"message": (msg: Message) => this.onMessage(msg)
		});
		this.dbClient = getDB();

		this.dbClient.schema.hasTable("count").then(itHas => {
			if (itHas) {
				this.log("ok", "DB: we have table `count`, can safely continue work...");
				this.dbInitialized = true;
				return;
			}
			this.log("warn", "DB: seems we doesn't have table `count` in database, going to create it right now");
			this.dbClient.schema.createTable("count", (tb) => {
				tb.integer("count").notNullable();
				tb.string("author").notNullable();
				tb.string("date").notNullable();
			}).catch(err => {
				this.log("err", "DB: we can't prepare DB", err);
			}).then(() => {
				this.log("ok", "DB: we successfully prepared our DB and ready to work!");
				this.dbInitialized = true;
			});
		});

		this.countRegex = /^\d{0,}$/i;
	}

	async onMessage(msg: Message) {
		if (msg.channel.id !== "295643316610007050") { return; }
		if (!msg.author) { return; }
		if (!this.dbInitialized) { return; }
		if (msg.channel.type === "dm") { return; }
		if (!msg.content) { msg.delete(); return; }
		const override = msg.content.startsWith("!");
		if (!this.countRegex.test(override ? msg.content.slice(1) : msg.content)) { msg.delete(); return; }

		if (override) {
			if (msg.author.id === $botConfig.botOwner) {
				const mNumber = parseInt(msg.content.slice(1), 10);
				if (isNaN(mNumber)) { msg.delete(); return; }
				await this.dbClient("count").insert({
					author: msg.author.id,
					count: mNumber,
					date: `${Date.now()}`
				});
				return;
			} else {
				msg.delete();
				return;
			}
		}

		const row = await this.dbClient("count").orderBy("count", "DESC").first("count", "author", "date");

		if (!row) { this.log("err", "Not found element"); return; }

		const rowDate = parseInt(row.date, 10);

		if (row.author === msg.author.id && ((Date.now() - rowDate) / 1000) < 180) { msg.delete(); return; }

		const mNumber = parseInt(msg.content, 10);
		if (isNaN(mNumber)) { msg.delete(); return; }

		if ((row.count + 1) !== mNumber) {
			msg.delete();
			return;
		}

		try {
			await this.dbClient("count").insert({
				author: msg.author.id,
				count: mNumber,
				date: `${Date.now()}`
			});
		} catch (err) {
			this.log("err", "Can't push number to DB", err);
			try {
				await msg.react("❌");
				await (<TextChannel> msg.channel).edit({
					topic: ":warning: База данных не отвечает..."
				});
				this.log("ok", "Successfully written error message to description and reacted to message");
			} catch (err) {
				this.log("err", "Cannot react to message or edit description of channel: ", err);
			}
		}

		try {
			await (<TextChannel> msg.channel).edit({
				topic: `:v: Последнее число: ${convertNumbers(mNumber)}`
			});
		} catch (err) {
			this.log("err", "Can't change description of channel", err);
		}

		if (Math.floor(Math.random() * 6) > 4 && row.author !== msg.client.user.id) {
			msg.channel.send((mNumber + 1).toString());
		}
	}

	unload() {
		this.unhandleEvents();
		return new Promise<boolean>((res) => res(true));
	}
}

module.exports = Count;
