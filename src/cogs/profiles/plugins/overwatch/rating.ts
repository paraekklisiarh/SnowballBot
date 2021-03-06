import { IProfilesPlugin, AddedProfilePluginType } from "../plugin";
import { Message, GuildMember } from "discord.js";
import { generateEmbed, EmbedType, IEmbedOptionsField } from "../../../utils/utils";
import { localizeForUser } from "../../../utils/ez-i18n";
import { IRegionalProfile } from "./owApiInterfaces";
import { getProfile, IOverwatchProfilePluginInfo } from "./overwatch";
import { DetailedError } from "../../../../types/Types";
import * as getLogger from "loggy";

const ACCEPTED_REGIONS = [ "eu", "kr", "us" ];
const ACCEPTED_PLATFORMS = [ "pc", "xbl", "psn" ];
const LOG = getLogger("OWRatingPlugin");

export interface IOWStatsPluginConfig {
	emojis: {
		competitive: string;
		quickplay: string;
		overwatchIcon: string;
		bronze: string;
		silver: string;
		gold: string;
		platinum: string;
		diamond: string;
		master: string;
		grandmaster: string;
		norating: string;
	};
}

export class OWStatsProfilePlugin implements IProfilesPlugin {
	public get signature() {
		return "snowball.features.profile.plugins.overwatch.stats";
	}

	config: IOWStatsPluginConfig;

	constructor(config: IOWStatsPluginConfig) {
		if (!config) {
			throw new Error("No config passed");
		}

		for (const emojiName of Object.keys(config.emojis)) {
			const emojiId = config.emojis[emojiName];
			const emoji = $discordBot.emojis.get(emojiId);
			if (!emoji) { throw new Error(`Emoji "${emojiName}" by ID "${emojiId}" wasn't found`); }
			config.emojis[emojiName] = emoji.toString();
		}

		this.config = Object.freeze(config);
	}

	async getSetupArgs(caller: GuildMember) {
		return localizeForUser(caller, "OWPROFILEPLUGIN_DEFAULT_ARGS");
	}

	async setup(str: string, member: GuildMember, msg: Message) {
		let status = await localizeForUser(member, "OWPROFILEPLUGIN_LOADING");

		let statusMsg = <Message> await msg.channel.send("", {
			embed: generateEmbed(EmbedType.Progress, status)
		});

		const postStatus = async () => {
			statusMsg = await statusMsg.edit("", {
				embed: generateEmbed(EmbedType.Progress, `${statusMsg.content}`)
			});
		};

		const args = str.split(";").map(arg => arg.trim());

		if (args.length === 0) {
			await statusMsg.edit("", {
				embed: generateEmbed(EmbedType.Error, await localizeForUser(member, "OWPROFILEPLUGIN_ERR_ARGS"))
			});
			throw new Error("Invalid argumentation");
		}

		const info = {
			platform: (args[2] || "pc").toLowerCase(),
			region: (args[1] || "eu").toLowerCase(),
			battletag: args[0].replace(/\#/i, () => "-"),
			verifed: false
		};

		if (ACCEPTED_REGIONS.indexOf(info.region) === -1) {
			await statusMsg.edit("", {
				embed: generateEmbed(EmbedType.Error, await localizeForUser(member, "OWPROFILEPLUGIN_ERR_WRONGREGION"), {
					fields: [ {
						inline: false,
						name: await localizeForUser(member, "OWPROFILEPLUGIN_AVAILABLE_REGIONS"),
						value: ACCEPTED_REGIONS.join("\n")
					} ]
				})
			});
			throw new Error("Invalid argumentation");
		}

		if (ACCEPTED_PLATFORMS.indexOf(info.platform)) {
			await statusMsg.edit("", {
				embed: generateEmbed(EmbedType.Error, await localizeForUser(member, "OWPROFILEPLUGIN_ERR_WRONGPLATFORM"), {
					fields: [ {
						inline: false,
						name: await localizeForUser(member, "OWPROFILEPLUGIN_AVAILABLE_PLATFORMS"),
						value: ACCEPTED_PLATFORMS.join("\n")
					} ]
				})
			});
			throw new Error("Invalid argumentantion");
		}

		if (!info.battletag) {
			throw new Error("Invalid argumentation");
		}

		status = await localizeForUser(msg.member, "OWPROFILEPLUGIN_FETCHINGPROFILE");
		postStatus();
		try {
			await getProfile(info.battletag, info.region, info.platform);
		} catch (err) {
			if (err instanceof DetailedError) {
				switch (err.code) {
					case "OWAPI_FETCH_ERR_PROFILE_NOTFOUND": {
						await statusMsg.edit("", {
							embed: generateEmbed(EmbedType.Error, await localizeForUser(member, "OWPROFILEPLUGIN_ERR_FETCHINGFAILED"))
						});
					} break;
					default: {
						await statusMsg.edit("", {
							embed: generateEmbed(EmbedType.Error, await localizeForUser(member, "OWPROFILEPLUGIN_ERR_FETCHINGFAILED_API"))
						});
					} break;
				}
			}
			throw new Error("Could not get the profile");
		}

		const json = JSON.stringify(info);

		await statusMsg.delete();

		return {
			json: json,
			type: AddedProfilePluginType.Embed
		};
	}

	async getEmbed(info: string | IOverwatchProfilePluginInfo, caller: GuildMember): Promise<IEmbedOptionsField> {
		if (typeof info !== "object") {
			info = <IOverwatchProfilePluginInfo> JSON.parse(info);
		}

		let profile: IRegionalProfile | undefined = undefined;
		try {
			profile = await getProfile(info.battletag, info.region, info.platform);
		} catch (err) {
			LOG("err", "Error during getting profile", err, info);
			throw new Error("Can't get profile");
		}

		if (!profile) {
			LOG("err", "Can't get profile: ", info);
			throw new Error("Exception not catched, but value not present.");
		}

		let str = "";

		str += `**${await localizeForUser(caller, "OWPROFILEPLUGIN_LEVEL", {
			level: (100 * profile.stats.quickplay.overall_stats.prestige) + profile.stats.quickplay.overall_stats.level
		})}**\n`;

		const atStrs = {
			win: await localizeForUser(caller, "OWPROFILEPLUGIN_STAT_WIN"),
			loss: await localizeForUser(caller, "OWPROFILEPLUGIN_STAT_LOSS"),
			tie: await localizeForUser(caller, "OWPROFILEPLUGIN_STAT_TIE")
		};

		str += `${this.config.emojis.norating} __**${await localizeForUser(caller, "OWPROFILEPLUGIN_COMPETITIVE")}**__\n`;

		if (!profile.stats.competitive || !profile.stats.competitive.overall_stats.comprank) {
			str += this.getTierEmoji(null);
			str += await localizeForUser(caller, "OWPROFILEPLUGIN_PLACEHOLDER");
		} else {
			const compOveral = profile.stats.competitive.overall_stats;
			str += `${await localizeForUser(caller, "OWPROFILEPLUGIN_RATING", {
				tier_emoji: this.getTierEmoji(compOveral.tier),
				rank: compOveral.comprank
			})}\n`;
			str += `${await localizeForUser(caller, "OWPROFILEPLUGIN_GAMESPLAYED", {
				games: compOveral.games
			})}\n`;

			str += ` ${atStrs.win}: ${compOveral.wins}.\n ${atStrs.loss}: ${compOveral.losses}.\n ${atStrs.tie}: ${compOveral.ties}.\n`;
			str += `  (${await localizeForUser(caller, "OWPROFILEPLUGIN_WINRATE", {
				winrate: compOveral.win_rate
			})})`;
		}

		str += `\n${this.config.emojis.quickplay} __**${await localizeForUser(caller, "OWPROFILEPLUGIN_QUICKPLAY")}**__\n`;

		if (!profile.stats.quickplay) {
			str += await localizeForUser(caller, "OWPROFILEPLUGIN_PLACEHOLDER");
		} else {
			const qpOveral = profile.stats.quickplay.overall_stats;

			// str += (await localizeForUser(caller, "OWPROFILEPLUGIN_GAMESPLAYED", {
			// 	games: qpOveral.games
			// })) + "\n";
			// str += ` ${atStrs.win}: ${qpOveral.wins}.\n ${atStrs.loss}: ${qpOveral.losses}.\n`;
			// str += `  (`;
			// str += (await localizeForUser(caller, "OWPROFILEPLUGIN_WINRATE", {
			// 	winrate: qpOveral.win_rate
			// })) + ")";
			str += `${await localizeForUser(caller, "OWPROFILEPLUGIN_HOURSPLAYED", {
				hours: profile.stats.quickplay.game_stats.time_played
			})}\n`;
			str += await localizeForUser(caller, "OWPROFILEPLUGIN_GAMESWON", {
				gamesWon: qpOveral.wins
			});
		}

		return {
			inline: true,
			name: `${this.config.emojis.overwatchIcon} Overwatch`,
			value: str
		};
	}

	getTierEmoji(tier: "bronze" | "silver" | "gold" | "platinum" | "diamond" | "master" | "grandmaster" | null) {
		if (!tier) { return this.config.emojis.norating; }
		return this.config.emojis[tier];
	}

	async unload() { return true; }
}

module.exports = OWStatsProfilePlugin;
