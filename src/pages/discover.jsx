import DiscoverPage from '../components/DiscoverPage.jsx'
import { MIN_VOTE_COUNT } from '../utils/discoverHelpers.js'

const FETCH_OPTIONS = { voteCountGte: MIN_VOTE_COUNT }

export default function Discover() {
  return (
    <DiscoverPage
      basePath="/discover"
      pageEyebrow="Discover"
      pageTitle="找電影"
      resultsAriaLabel="找電影列表"
      fetchOptions={FETCH_OPTIONS}
    />
  )
}
