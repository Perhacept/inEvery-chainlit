import getRouterBasename from '@/lib/router';
import { Navigate, createBrowserRouter } from 'react-router-dom';

import AuthCallback from 'pages/AuthCallback';
import Element from 'pages/Element';
import Env from 'pages/Env';
import Login from 'pages/Login';
import Playground from 'pages/Playground';
import Thread from 'pages/Thread';
import Workspace from 'pages/Workspace';

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <Playground />
    },
    {
      path: '/workspace/:projectId',
      element: <Workspace />
    },
    {
      path: '/workspace/:projectId/new',
      element: <Workspace />
    },
    {
      path: '/workspace/:projectId/thread/:threadId',
      element: <Workspace />
    },
    {
      path: '/env',
      element: <Env />
    },
    {
      path: '/thread/:id?',
      element: <Thread />
    },
    {
      path: '/element/:id',
      element: <Element />
    },
    {
      path: '/login',
      element: <Login />
    },
    {
      path: '/login/callback',
      element: <AuthCallback />
    },
    {
      path: '/share/:id',
      element: <Thread />
    },
    {
      path: '*',
      element: <Navigate replace to="/" />
    }
  ],
  { basename: getRouterBasename() }
);
