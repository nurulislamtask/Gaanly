import { Feed } from "../components/Feed";
import { PageHeader } from "../components/Page";

/** Home: the logo bar, then the feed (Top Artist, banner, Recently Played, genres, shelves). */
export default function Home() {
  return (
    <div className="pb-8">
      <PageHeader />
      <div className="pt-2">
        <Feed />
      </div>
    </div>
  );
}
