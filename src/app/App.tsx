import { RouterProvider } from "react-router";
import { router } from "@/app/routes";
import { WalletProviders } from "@/app/providers/WalletProviders";

function App() {
  return (
    <WalletProviders>
      <RouterProvider router={router} />
    </WalletProviders>
  );
}

export default App;
