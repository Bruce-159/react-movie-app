import DiscoverPage from '../components/DiscoverPage.jsx'

const FETCH_OPTIONS = {
  originCountry: 'TW',
  minReleaseGteWhenAll: '2010-01-01',
}

export default function DiscoverTaiwan() {
  return (
    <DiscoverPage
      basePath="/discover/taiwan"
      pageEyebrow="Taiwan Cinema"
      pageTitle="找國片"
      resultsAriaLabel="找國片列表"
      fetchOptions={FETCH_OPTIONS}
      showRating={false}
    />
  )
}
