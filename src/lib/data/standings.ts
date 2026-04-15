import { type StandingEntity, smStandings } from '@/lib/sportmonks';

export async function getStandings(): Promise<StandingEntity[]> {
  try {
    const { data, ...rest } = await smStandings(undefined, {
      include: [
        ['participant', ['name', 'short_code', 'image_path'].join()].join(':'),
        'details.type',
        'form',
      ].join(';'),
    });

    console.info(rest);

    const cleanData = data.map(({ details, ...rest }) => ({
      ...rest,
      stats: Object.fromEntries(
        details.map(({ type, value }) => [type.code, value]),
      ),
    }));

    return cleanData as unknown as StandingEntity[];
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      error,
    } as unknown as StandingEntity[];
  }
}
