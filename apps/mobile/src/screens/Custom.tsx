import { useEffect, useState } from "react";
import { feedUrlFor, rankItems, safeHttps, type Ranking } from "@algone/core";
import { refreshFeeds } from "../feedSync";
import { useNav } from "../nav";
import { openUrl } from "../openUrl";
import { store } from "../store";
import { useStored } from "../theme";
import { Body, Button, Card, Choice, Field, Row, Screen } from "../ui";

const RANKINGS: Array<[Ranking, string]> = [
  ["newest", "Newest"],
  ["fair", "Fair by source"],
  ["oldestUnseen", "Oldest unseen"],
];

export function CustomScreen() {
  const nav = useNav();
  const { feeds, settings } = useStored();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => void refreshFeeds(store), []);

  const add = async () => {
    const feed = feedUrlFor(url) ?? safeHttps(url.trim());
    if (!feed) {
      setError("Enter an https feed address.");
      return;
    }
    setError("");
    setUrl("");
    await store.sourceAdd({ kind: "rss", url: feed, title: new URL(feed).hostname, site: "" });
    await refreshFeeds(store);
  };

  return (
    <Screen title="Custom feed">
      <Card>
        <Field
          accessibilityLabel="Feed address"
          placeholder="https://example.com/feed"
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        {error ? <Body muted>{error}</Body> : null}
        <Button label="Add feed" onPress={() => void add()} />
        {feeds.sources.map((s) => (
          <Row key={s.id}>
            <Body size={13}>{s.title}</Body>
            <Button label="Remove" onPress={() => void store.sourceRemove(s.id)} />
          </Row>
        ))}
      </Card>
      <Choice
        value={settings.customRanking}
        options={RANKINGS}
        onChange={(value) => void store.patch({ op: "setGlobal", key: "customRanking", value })}
      />
      {feeds.items.length === 0 ? <Body muted>Add a feed to start.</Body> : null}
      {rankItems(feeds.items, settings.customRanking).map((item) => (
        <Button
          key={item.id}
          kind="ghost"
          label={item.title}
          onPress={() => {
            void store.feedSeen(item.id);
            openUrl(item.url, nav.push);
          }}
        />
      ))}
    </Screen>
  );
}
