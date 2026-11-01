import { useMemo, useState } from "react";
import { COPY, visibleQueue } from "@algone/core";
import { SITES } from "@algone/rules";
import { MOBILE_COPY } from "../copy";
import { useNav } from "../nav";
import { homeUrl, searchUrlFor } from "../navigationPolicy";
import { openUrl } from "../openUrl";
import { useStored } from "../theme";
import { Body, Button, Card, Choice, Field, Row, Screen } from "../ui";

export function HomeScreen() {
  const nav = useNav();
  const { queue, settings } = useStored();
  const searchable = useMemo(() => SITES.filter((s) => s.searchUrl), []);
  const [site, setSite] = useState(searchable[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const { items, hiddenCount } = visibleQueue(queue, settings.queueSoftCap, showAll);

  const search = () => {
    const rule = searchable.find((s) => s.id === site);
    const url = rule && searchUrlFor(rule, query);
    if (rule && url) nav.push({ name: "site", site: rule.id, url });
  };

  return (
    <Screen>
      <Body strong size={24}>Algone</Body>
      <Card>
        <Choice value={site} options={searchable.map((s) => [s.id, s.name])} onChange={setSite} />
        <Field
          accessibilityLabel="Search"
          placeholder="Search"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={search}
          returnKeyType="search"
          autoCapitalize="none"
        />
      </Card>
      <Row>
        {SITES.map((s) => (
          <Button
            key={s.id}
            label={s.name}
            onPress={() => nav.push({ name: "site", site: s.id, url: homeUrl(s) })}
          />
        ))}
      </Row>
      <Card>
        <Body strong>Saved for later</Body>
        {items.length === 0 ? <Body muted>Nothing saved yet.</Body> : null}
        {items.map((q) => (
          <Button key={q.id} kind="ghost" label={q.title} onPress={() => openUrl(q.url, nav.push)} />
        ))}
        {hiddenCount > 0 ? <Button label={`Show ${hiddenCount} more`} onPress={() => setShowAll(true)} /> : null}
      </Card>
      <Row>
        <Button label="Queue" onPress={() => nav.push({ name: "queue" })} />
        <Button label="Custom feed" onPress={() => nav.push({ name: "custom" })} />
        <Button label="Random" onPress={() => nav.push({ name: "random" })} />
        <Button label="Settings" onPress={() => nav.push({ name: "settings" })} />
      </Row>
      <Body muted size={13}>{MOBILE_COPY.inAppBrowser} {COPY.browserOnly}</Body>
      <Body muted size={13}>{MOBILE_COPY.youtubeSignIn}</Body>
    </Screen>
  );
}
