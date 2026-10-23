import Link from "next/link";

export default function NotFound() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center">
            <h1 className="text-6xl font-bold">404</h1>
            <p className="mt-4">Sorry, this product could not be found.</p>

            <Link href="/" className="mt-6 underline">
                Back to Home
            </Link>
        </main>
    );
}
