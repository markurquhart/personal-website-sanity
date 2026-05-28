"use client";

import { Icon } from "@iconify/react";
import { CloseIcon, SearchIcon } from "@sanity/icons";
import {
  Box,
  Button,
  Card,
  Dialog,
  Flex,
  Grid,
  Spinner,
  Stack,
  Text,
  TextInput,
} from "@sanity/ui";
import { useCallback, useEffect, useId, useState } from "react";
import { set, unset, type ObjectInputProps } from "sanity";

type IconValue = { _type?: "icon"; name?: string } | undefined;

async function searchIconify(
  query: string,
  signal: AbortSignal,
): Promise<string[]> {
  const url = new URL("https://api.iconify.design/search");
  url.searchParams.set("query", query);
  url.searchParams.set("limit", "60");
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Icon search failed (${res.status})`);
  const json = (await res.json()) as { icons?: string[] };
  return json.icons ?? [];
}

export function NavIconifyInput(props: ObjectInputProps) {
  const { value, onChange, readOnly } = props;
  const selected = (value as IconValue)?.name ?? null;
  const dialogId = useId();

  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [icons, setIcons] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedTerm(term.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [term]);

  useEffect(() => {
    if (!open) return;

    if (debouncedTerm.length === 0) {
      setIcons([]);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    searchIconify(debouncedTerm, controller.signal)
      .then(setIcons)
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Search failed");
        setIcons([]);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [open, debouncedTerm]);

  const close = useCallback(() => {
    setOpen(false);
    setTerm("");
    setDebouncedTerm("");
    setIcons([]);
    setError(null);
  }, []);

  const pick = useCallback(
    (iconId: string) => {
      onChange(
        set({
          _type: "icon",
          ...(value as IconValue),
          name: iconId,
        }),
      );
      close();
    },
    [close, onChange, value],
  );

  const clear = useCallback(() => onChange(unset()), [onChange]);

  return (
    <Stack space={3}>
      <Flex align="center" gap={3} wrap="wrap">
        {selected ? (
          <Card padding={3} radius={2} border>
            <Icon icon={selected} width={28} height={28} />
          </Card>
        ) : null}
        <Button
          text={selected ? "Change icon" : "Choose icon"}
          disabled={readOnly}
          onClick={() => setOpen(true)}
        />
        {selected && !readOnly ? (
          <Button text="Clear" mode="ghost" tone="critical" onClick={clear} />
        ) : null}
      </Flex>

      {selected ? (
        <Text size={1} muted>
          {selected}
        </Text>
      ) : null}

      {open ? (
        <Dialog
          id={dialogId}
          header="Choose icon"
          onClose={close}
          width={2}
          footer={
            <Flex padding={3} justify="flex-end">
              <Button
                text="Close"
                mode="ghost"
                icon={CloseIcon}
                onClick={close}
              />
            </Flex>
          }
        >
          <Box padding={4}>
            <Stack space={4}>
              <TextInput
                icon={SearchIcon}
                value={term}
                onChange={(e) => setTerm(e.currentTarget.value)}
                placeholder="Search Iconify (linkedin, mail, book…)"
                fontSize={2}
                padding={3}
                autoFocus
              />

              <Box style={{ maxHeight: "min(60vh, 480px)", overflowY: "auto" }}>
                {debouncedTerm.length === 0 ? (
                  <Text muted size={1}>
                    Type to search 150k+ icons (Simple Icons, Lucide, Material
                    Design, and more).
                  </Text>
                ) : null}

                {loading ? (
                  <Flex align="center" justify="center" gap={3} padding={5}>
                    <Spinner muted />
                    <Text muted size={1}>
                      Searching…
                    </Text>
                  </Flex>
                ) : null}

                {error ? (
                  <Card padding={3} radius={2} tone="critical">
                    <Text size={1}>{error}</Text>
                  </Card>
                ) : null}

                {!loading && !error && debouncedTerm && icons.length === 0 ? (
                  <Text muted size={1}>
                    No icons found. Try another name or collection (e.g.
                    simple-icons).
                  </Text>
                ) : null}

                {!loading && icons.length > 0 ? (
                  <Grid columns={[4, 5, 6]} gap={2}>
                    {icons.map((iconId) => (
                      <Button
                        key={iconId}
                        mode={selected === iconId ? "default" : "bleed"}
                        tone={selected === iconId ? "primary" : "default"}
                        padding={3}
                        title={iconId}
                        onClick={() => pick(iconId)}
                      >
                        <Icon icon={iconId} width={28} height={28} />
                      </Button>
                    ))}
                  </Grid>
                ) : null}
              </Box>
            </Stack>
          </Box>
        </Dialog>
      ) : null}
    </Stack>
  );
}
