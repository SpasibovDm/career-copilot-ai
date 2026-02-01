# Vacancy Sources (RSS + HTML)

Career Copilot supports fully free vacancy ingestion via RSS feeds and simple HTML “career page” scraping.
Use the admin page to add sources and configure selectors.

## RSS sources

RSS feeds require only a name and URL.

Example sources:

```json
{
  "type": "rss",
  "name": "Berlin Startup Jobs",
  "url": "https://berlinstartupjobs.com/engineering/feed/"
}
```

```json
{
  "type": "rss",
  "name": "GermanTechJobs",
  "url": "https://germantechjobs.de/jobs.rss"
}
```

## HTML career page sources

HTML sources use a JSON config with CSS selectors. The ingestion engine will scrape each element
matching `list_selector`, then pull fields using the provided selectors.

Supported config keys:

- `list_selector`: CSS selector for the list of job cards (default: `article`)
- `title_selector`: selector for job title (default: `h2`)
- `location_selector`: selector for location text
- `company_selector`: selector for company name
- `url_selector`: selector to find link href (default: `a`)
- `description_selector`: selector for short description text
- `external_id_attr`: attribute name used to deduplicate (e.g., `data-id`)

Example configuration:

```json
{
  "type": "html",
  "name": "Example Career Page",
  "url": "https://example.com/careers",
  "config": {
    "list_selector": ".job-card",
    "title_selector": ".job-title",
    "location_selector": ".job-location",
    "company_selector": ".job-company",
    "url_selector": "a",
    "description_selector": ".job-summary",
    "external_id_attr": "data-job-id"
  }
}
```

## CSV URL sources

CSV URLs are supported for quick imports. The CSV header should include:

```
title,company,location,url,description,external_id
```

Example configuration:

```json
{
  "type": "csv_url",
  "name": "Public CSV Feed",
  "url": "https://example.com/jobs.csv"
}
```

## Deduplication rules

Vacancies are deduplicated by:

1. `(source_id, external_id)` when provided.
2. A normalized hash of `company + title + location + url` as fallback.

This keeps daily runs idempotent and avoids duplicate entries.
