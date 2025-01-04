import React, { memo } from 'react'; // react v18.2.0
import { Box, Typography, Breadcrumbs, Link, Stack } from '@mui/material'; // @mui/material v5.x
import { styled } from '@mui/material/styles'; // @mui/material v5.x
import { useTheme } from '../../hooks/useTheme';

// Interface for component props
interface PageHeaderProps {
  title: string;
  breadcrumbs?: Array<{ label: string; path: string }>;
  actions?: React.ReactNode;
}

// Styled components with theme-aware styles
const HeaderContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  borderBottom: '1px solid',
  borderColor: theme.palette.divider,
  transition: 'all 0.2s ease-in-out',
  backgroundColor: theme.palette.background.paper,
}));

const TitleSection = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: theme.spacing(1),
  flexWrap: 'wrap',
  gap: theme.spacing(2),
}));

const StyledBreadcrumbs = styled(Breadcrumbs)(({ theme }) => ({
  marginBottom: theme.spacing(1),
  color: theme.palette.text.secondary,
  transition: 'color 0.2s ease-in-out',
  '& .MuiLink-root': {
    color: theme.palette.text.secondary,
    textDecoration: 'none',
    '&:hover': {
      color: theme.palette.primary.main,
      textDecoration: 'underline',
    },
  },
}));

const PageHeader = memo(({ title, breadcrumbs, actions }: PageHeaderProps) => {
  const { theme } = useTheme();

  return (
    <HeaderContainer role="banner" component="header">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <StyledBreadcrumbs aria-label="page navigation">
          {breadcrumbs.map(({ label, path }, index) => (
            <Link
              key={path}
              href={path}
              color={index === breadcrumbs.length - 1 ? 'textPrimary' : 'inherit'}
              aria-current={index === breadcrumbs.length - 1 ? 'page' : undefined}
            >
              {label}
            </Link>
          ))}
        </StyledBreadcrumbs>
      )}

      <TitleSection>
        <Typography
          variant="h4"
          component="h1"
          color="textPrimary"
          sx={{
            fontWeight: 500,
            transition: 'color 0.2s ease-in-out',
          }}
        >
          {title}
        </Typography>

        {actions && (
          <Stack
            direction="row"
            spacing={2}
            sx={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            {actions}
          </Stack>
        )}
      </TitleSection>
    </HeaderContainer>
  );
});

PageHeader.displayName = 'PageHeader';

export default PageHeader;