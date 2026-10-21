'use client'

import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react'

// tabs = [{ id, label, content }]; arrow keys move between tabs.
export default function Tabs({ tabs, defaultIndex = 0, selectedIndex, onChange, label }) {
  return (
    <TabGroup defaultIndex={defaultIndex} selectedIndex={selectedIndex} onChange={onChange}>
      <TabList className="va-tabs-list" aria-label={label}>
        {tabs.map((tab) => (
          <Tab key={tab.id} className="va-tab">{tab.label}</Tab>
        ))}
      </TabList>
      <TabPanels>
        {tabs.map((tab) => (
          <TabPanel key={tab.id} className="va-tab-panel">{tab.content}</TabPanel>
        ))}
      </TabPanels>
    </TabGroup>
  )
}
