import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Auth0Provider } from '@auth0/auth0-react';
import App from './App.tsx';
import { ResetPasswordForm } from './components/ResetPasswordForm.tsx';
import { PublicUserJourneyView } from './components/PublicUserJourneyView.tsx';
import { auth0Config, isAuth0Configured } from './lib/auth0';
import './index.css';


const root = createRoot(document.getElementById('root')!);

const AppWithProviders = () => {
  const routes = (
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/reset-password" element={<ResetPasswordForm />} />
      <Route path="/public/user-journey/:shortId" element={<PublicUserJourneyView />} />
      <Route path="/project/:shortId" element={<App />} />
      <Route path="/stakeholder/:shortId" element={<App />} />
      <Route path="/note/:shortId" element={<App />} />
      <Route path="/user-story/:shortId" element={<App />} />
      <Route path="/theme/:shortId" element={<App />} />
      <Route path="/design/:shortId" element={<App />} />
      <Route path="/law-firm/:shortId" element={<App />} />
      <Route path="/law-firms" element={<App />} />
      <Route path="/user-journey/:shortId" element={<App />} />
      <Route path="/user-journeys" element={<App />} />
      <Route path="/user-journey-creator" element={<App />} />
      <Route path="/themes" element={<App />} />
      <Route path="/stakeholders" element={<App />} />
      <Route path="/settings" element={<App />} />
      <Route path="/design-system" element={<App />} />
    </Routes>
  );

  // Always wrap with Auth0Provider to allow useAuth0 hook to be called
  // When not configured, pass placeholder values (won't be used)
  return (
    <Auth0Provider
      domain={auth0Config.domain || 'placeholder.auth0.com'}
      clientId={auth0Config.clientId || 'placeholder'}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: auth0Config.authorizationParams.audience || '',
      }}
      skipRedirectCallback={!isAuth0Configured}
    >
      {routes}
    </Auth0Provider>
  );
};

root.render(
  <StrictMode>
    <BrowserRouter>
      <AppWithProviders />
    </BrowserRouter>
  </StrictMode>
);
