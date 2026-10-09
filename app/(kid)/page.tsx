import { CollectionRow } from "@/components/home/CollectionRow";
import { ComingSoonRow } from "@/components/home/ComingSoonRow";
import { FeaturedBanner } from "@/components/home/FeaturedBanner";
import { HomeFooter } from "@/components/home/HomeFooter";
import { HomeHero } from "@/components/home/HomeHero";
import { Scene, Sky } from "@/components/kid/Scene";
import { TimeGate } from "@/components/TimesUp";
import { getFeatured, getSeasons } from "@/content";

export default function HomePage() {
  const seasons = getSeasons();
  const published = seasons.filter((s) => s.status === "published");
  const featured = getFeatured();

  return (
    <TimeGate mode="live">
      {/* Morning (or night) sky and hills behind the top bar and the slider. */}
      <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-[460px] md:h-[620px]">
        <Sky className="absolute inset-0" />
        <Scene
          name="home-hills"
          eager
          className="absolute inset-x-0 bottom-0 block"
          imgClassName="block h-44 w-full object-cover object-bottom md:h-72"
        />
        <div className="absolute inset-x-0 -bottom-px h-16 bg-gradient-to-b from-transparent to-ground" />
      </div>

      <div className="mx-auto max-w-[1400px] pt-2">
        <HomeHero featured={featured} seasons={seasons} />
        {published.map((season, i) => (
          <CollectionRow key={season.id} season={season} allSeasons={seasons} eager={i === 0} />
        ))}
        <FeaturedBanner seasons={seasons} />
        <ComingSoonRow seasons={seasons.filter((s) => s.status === "coming_soon")} />
      </div>
      <HomeFooter />
    </TimeGate>
  );
}
