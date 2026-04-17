'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { DriveInToast } from './DriveInToast'

/**
 * Lädt die project_ids des eingeloggten Gastronomen
 * und rendert den DriveInToast für jedes Projekt.
 */
export function DriveInToastProvider() {
  const [projectIds, setProjectIds] = useState<string[]>([])

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      supabase
        .from('projects')
        .select('id, drive_in_enabled')
        .eq('user_id', data.user.id)
        .then(({ data: projects }) => {
          if (projects) {
            // Alle Projekte des Gastronomen abhören — drive_in_enabled Projekte filtern
            const driveInIds = projects
              .filter(p => p.drive_in_enabled)
              .map(p => p.id)
            setProjectIds(driveInIds)
          }
        })
    })
  }, [])

  return (
    <>
      {projectIds.map(id => (
        <DriveInToast key={id} projectId={id} />
      ))}
    </>
  )
}
