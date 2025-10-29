import { Skeleton, Box, Paper } from '@mui/material'

interface LoadingSkeletonProps {
  variant?: 'table' | 'card' | 'form'
  rows?: number
}

export default function LoadingSkeleton({ 
  variant = 'table', 
  rows = 5 
}: LoadingSkeletonProps) {
  if (variant === 'table') {
    return (
      <Paper sx={{ p: 2 }}>
        <Box sx={{ mb: 2 }}>
          <Skeleton variant="text" width="30%" height={40} />
        </Box>
        {Array.from({ length: rows }).map((_, index) => (
          <Box key={index} sx={{ display: 'flex', gap: 2, mb: 1 }}>
            <Skeleton variant="rectangular" width="25%" height={40} />
            <Skeleton variant="rectangular" width="20%" height={40} />
            <Skeleton variant="rectangular" width="15%" height={40} />
            <Skeleton variant="rectangular" width="20%" height={40} />
            <Skeleton variant="rectangular" width="20%" height={40} />
          </Box>
        ))}
      </Paper>
    )
  }

  if (variant === 'card') {
    return (
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {Array.from({ length: rows }).map((_, index) => (
          <Paper key={index} sx={{ p: 2, minWidth: 200, flex: 1 }}>
            <Skeleton variant="text" width="60%" height={30} />
            <Skeleton variant="text" width="40%" height={20} />
            <Skeleton variant="rectangular" width="100%" height={100} sx={{ mt: 1 }} />
          </Paper>
        ))}
      </Box>
    )
  }

  if (variant === 'form') {
    return (
      <Paper sx={{ p: 3 }}>
        <Skeleton variant="text" width="40%" height={40} sx={{ mb: 3 }} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Skeleton variant="rectangular" width="100%" height={56} />
          <Skeleton variant="rectangular" width="100%" height={56} />
          <Skeleton variant="rectangular" width="50%" height={56} />
          <Skeleton variant="rectangular" width="100%" height={120} />
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Skeleton variant="rectangular" width={100} height={36} />
            <Skeleton variant="rectangular" width={100} height={36} />
          </Box>
        </Box>
      </Paper>
    )
  }

  return null
}
