export interface PlayerData {
    prefix: string;
    name: string;
    pronouns: string;
    country: string;
    region: string;

    socials: {
        twitter: string;
    };

    character?: number; // unset until one is picked
    skin: number;
    port: number;

    score: number;
    losers: boolean;
}
