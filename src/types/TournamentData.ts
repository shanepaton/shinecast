import type { PlayerData } from './PlayerData';

export interface TournamentData {
    name: string;
    round: string;
    bestOf: 3 | 5 | 'crews' | 'endless';
    nextUp: PlayerData[];
}
