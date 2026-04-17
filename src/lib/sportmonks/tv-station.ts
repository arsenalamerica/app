import { type Sportmonks, sportmonksFetch } from './sportmonks';

export type TvStationEntity = {
  id: number;
  name: string;
  url: string | null;
  image_path: string;
  type: string;
  related_id: number | null;
};

type TvStationEndpoint = {
  data: TvStationEntity;
} & Sportmonks;

export async function smTvStation(
  station_id: number,
  params?: Record<string, string>,
): Promise<TvStationEndpoint> {
  return sportmonksFetch<TvStationEndpoint>(
    `/tv-stations/${station_id}`,
    params,
  );
}
