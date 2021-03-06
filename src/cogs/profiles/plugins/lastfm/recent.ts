import { IProfilesPlugin, AddedProfilePluginType } from "../plugin";
import { GuildMember } from "discord.js";
import { IEmbedOptionsField, escapeDiscordMarkdown, resolveEmojiMap } from "../../../utils/utils";
import { getOrFetchRecents } from "./lastfm";
import { IRecentTracksResponse } from "./lastfmInterfaces";
import { localizeForUser, getUserLanguage } from "../../../utils/ez-i18n";
import { replaceAll } from "../../../utils/text";
import { DetailedError } from "../../../../types/Types";
import * as getLogger from "loggy";
import { default as ProfilesModule } from "../../profiles";

const LOG = getLogger("LastFMPlugin");

export interface ILastFMInfo {
	username: string;
}

export interface ILastFMPluginConfig {
	apiKey: string;
	emojis: {
		logo: string;
		ghost: string;
	};
}

export class LastFMRecentProfilePlugin implements IProfilesPlugin {
	public get signature() {
		return "snowball.features.profile.plugins.lastfm";
	}

	private readonly config: ILastFMPluginConfig;

	constructor(config: ILastFMPluginConfig) {
		// converting to any
		config.emojis = <any> resolveEmojiMap(config.emojis, $discordBot.emojis);
		this.config = config;
	}

	public async getSetupArgs(caller: GuildMember) {
		return localizeForUser(caller, "LASTFMPROFILEPLUGIN_ARGS");
	}

	public async setup(str: string) {
		const info: ILastFMInfo = { username: str };

		try {
			await getOrFetchRecents(info.username, this.config.apiKey);
		} catch (err) {
			LOG("err", `setup(${info.username}): Failed to get recent tracks`, err);
			throw new Error(`Failed to fetch recent tracks of "${info.username}"`);
		}

		return {
			json: JSON.stringify(info),
			type: AddedProfilePluginType.Embed
		};
	}

	public async getEmbed(info: ILastFMInfo | string, caller: GuildMember, profilesModule: ProfilesModule): Promise<IEmbedOptionsField> {
		if (typeof info !== "object") { info = <ILastFMInfo> JSON.parse(info); }

		const logPrefix = `getEmbed(${info.username}):`;
		let profile: IRecentTracksResponse | undefined = undefined;
		try {
			LOG("info", logPrefix, "Getting recent tracks...");
			profile = await getOrFetchRecents(info.username, this.config.apiKey);
		} catch (err) {
			LOG("err", logPrefix, "Failed to get recent tracks", err);

			let errKey = "LASTFMPROFILEPLUGIN_ERR_UNKNOWN@NOERROR";
			if (err instanceof DetailedError) {
				switch (err.code) {
					case "LASTFM_GETRECENTS_ERR_NOTFOUND": {
						errKey = "LASTFMPROFILEPLUGIN_ERR_NOTFOUND";
					} break;
					case "LASTFM_GETRECENTS_ERR_SERVERERROR": {
						errKey = "LASTFMPROFILEPLUGIN_ERR_SERVERERROR";
					} break;
					default: {
						errKey = "LASTFMPROFILEPLUGIN_ERR_UNKNOWN";
					} break;
				}
			}

			return {
				inline: true,
				name: `${this.config.emojis.logo} Last.fm`,
				value: `❌ ${await localizeForUser(caller, errKey)}`
			};
		}

		if (!profile) {
			LOG("err", logPrefix, "No 'profile' variable!");
			return {
				inline: true,
				name: `${this.config.emojis.logo} Last.fm`,
				value: `❌ ${await localizeForUser(caller, "LASTFMPROFILEPLUGIN_ERR_INVALIDRESP")}`
			};
		}

		try {
			let str = profile.recenttracks.track.length === 0 ? `${this.config.emojis.ghost} ${await localizeForUser(caller, "")}` : "";
			let tracksCount = 0;
			for (const track of profile.recenttracks.track) {
				if (++tracksCount > 3) { break; }
				const fixedUrl = replaceAll(replaceAll(track.url, "(", "%28"), ")", "%29");

				let trackStr = await localizeForUser(caller, "LASTFMPROFILEPLUGIN_TRACK", {
					name: escapeDiscordMarkdown(track.name, true),
					artist: escapeDiscordMarkdown(track.artist["#text"], true)
				});

				trackStr = `[${trackStr}](${fixedUrl})`;

				// just typescript and "wtf":
				//  see I checked `track["@attr"]` and now in second check of now playing
				//  it tells me that `"@attr"` IS POSSIBLE TO BE UNDEFINED WOOOOOOOAH DUDEEEEE
				if (track["@attr"] && track["@attr"]!.nowplaying) {
					trackStr = `🎵 ${trackStr}`;
				} else if (track.date) {
					const playedAt = Number(track.date.uts) * 1000;
					const sincePlayed = profilesModule.serverTimeHumanize(Date.now() - playedAt, 1, false, await getUserLanguage(caller));
					trackStr = ` ${trackStr} \`${await localizeForUser(caller, "LASTFMPROFILEPLUGIN_SINCEPLAYED", {
						sincePlayed
					})}\``;
				}

				str += `${trackStr}\n`;
			}

			return {
				inline: true,
				name: `${this.config.emojis.logo} Last.fm`,
				value: str
			};
		} catch (err) {
			LOG("err", logPrefix, "Failed to generate embed", err);
			throw new Error("Failed to generate embed");
		}
	}

	async unload() { return true; }
}

module.exports = LastFMRecentProfilePlugin;
