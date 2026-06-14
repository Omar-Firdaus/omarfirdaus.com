#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const feedPath = path.join(root, "feed.xml");
const postsPath = path.join(root, "posts.json");

const SITE_URL = "https://omarfirdaus.com";

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toRssDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toUTCString();
  return date.toUTCString();
}

function itemXml(post) {
  const title = escapeXml(post.title);
  const link = escapeXml(post.link);
  const guid = escapeXml(post.guid || post.link);
  const pubDate = toRssDate(post.pubDate);
  const description = escapeXml(post.description || "");

  let xml = `    <item>
      <title>${title}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${guid}</guid>
      <pubDate>${pubDate}</pubDate>`;

  if (description) {
    xml += `\n      <description>${description}</description>`;
  }

  xml += "\n    </item>";
  return xml;
}

function loadPosts() {
  if (!fs.existsSync(postsPath)) return [];

  const posts = JSON.parse(fs.readFileSync(postsPath, "utf8"));
  if (!Array.isArray(posts)) {
    throw new Error("posts.json must be an array");
  }

  return posts.map((post) => {
    if (!post.title || !post.link || !post.pubDate) {
      throw new Error("Each post needs title, link, and pubDate");
    }

    const link = post.link.startsWith("http")
      ? post.link
      : `${SITE_URL}/${post.link.replace(/^\//, "")}`;

    return {
      title: post.title,
      link,
      guid: post.guid || link,
      pubDate: post.pubDate,
      description: post.description || "",
    };
  });
}

function main() {
  const items = loadPosts().sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  const lastBuildDate = items[0]?.pubDate
    ? toRssDate(items[0].pubDate)
    : new Date().toUTCString();

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Omar Firdaus</title>
    <link>${SITE_URL}/blog.html</link>
    <description>build cool hardware</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
${items.map(itemXml).join("\n")}
  </channel>
</rss>
`;

  fs.writeFileSync(feedPath, feed);
  console.log(`Wrote ${items.length} local post(s) to feed.xml`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
