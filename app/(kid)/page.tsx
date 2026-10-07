import { ContinueCard } from "@/components/ContinueCard";
import { HillsHeader } from "@/components/HillsHeader";
import { SeasonRow } from "@/components/SeasonRow";
import { getSeasons } from "@/content";

export default function HomePage() {
  const seasons = getSeasons();
  return (
    <>
      <HillsHeader />
      <ContinueCard seasons={seasons} />
      {seasons.map((season, i) => (
        <SeasonRow key={season.id} season={season} eager={i === 0} />
      ))}
    </>
  );
}
