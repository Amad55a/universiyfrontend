import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("./CommunitySidebar.jsx", () => ({
  default: () => <div data-testid="community-sidebar" />,
  CHARTER_FONT_STACK: "serif",
}));
vi.mock("./TrendingSidebar.jsx", () => ({
  default: () => <div data-testid="trending-sidebar" />,
}));
vi.mock("./communityHeader.jsx", () => ({
  default: () => <div data-testid="community-header" />,
}));
vi.mock("./WritePostModel.jsx", () => ({
  default: () => null,
}));

import CommunityLayout from "./communityLayout.jsx";

const renderAtPath = (path) => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/community" element={<CommunityLayout />}>
        <Route path="*" element={<div data-testid="page-content" />} />
      </Route>
    </Routes>
  </MemoryRouter>
);

describe("community layout trending rail", () => {
  it.each([
    "/community/meetings",
    "/community/groups",
    "/community/groups/group-1",
    "/community/chat",
    "/community/roadmaps",
    "/community/settings",
    "/community/help",
  ])("removes the trending rail and lets the content column expand on %s", (path) => {
    const { container } = renderAtPath(path);
    const layout = container.firstElementChild;
    const contentColumn = screen.getByTestId("community-header").parentElement;

    expect(screen.queryByTestId("trending-sidebar")).not.toBeInTheDocument();
    expect(layout.className).not.toContain("lg:gap-10");
    expect(contentColumn.className).toContain("flex-1");
    expect(contentColumn.className).toContain("min-w-0");
    expect(screen.getByTestId("page-content")).toBeInTheDocument();
  });

  it("keeps the meeting room full-bleed without either community rail", () => {
    renderAtPath("/community/meetings/room/ROOM01");

    expect(screen.queryByTestId("trending-sidebar")).not.toBeInTheDocument();
    expect(screen.queryByTestId("community-sidebar")).not.toBeInTheDocument();
    expect(screen.getByTestId("page-content")).toBeInTheDocument();
  });

  it("keeps the trending rail and existing desktop spacing on other community pages", () => {
    const { container } = renderAtPath("/community/trending");

    expect(screen.getByTestId("trending-sidebar")).toBeInTheDocument();
    expect(container.firstElementChild.className).toContain("lg:gap-10");
    expect(screen.getByTestId("page-content")).toBeInTheDocument();
  });
});
