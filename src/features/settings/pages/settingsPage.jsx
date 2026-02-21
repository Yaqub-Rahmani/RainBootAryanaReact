import DistrictList from "../../district/components/DistrictList";
import ProvinceList from "../../province/components/ProvinceList";
import Accordion from "../../../shared/components/Accordion";
import MarketList from "../../market/components/MarketList";
import FloorList from "../../floor/components/FloorList";
import OwnerShareList from "../components/ownerSharelist";
import SingleRateList from "../components/singleRateList";

export default function SettingsPage() {
  return (
    <div dir="rtl" className="min-h-screen flex flex-col">
      
      {/* SABİT HEADER */}
      <header className="px-6 pt-6">
        <h1 className="text-3xl font-bold mb-6">تنظیمات</h1>
      </header>

      {/* SADECE BURASI SCROLL */}
      <main className="flex-1 overflow-y-auto px-6 mt-5 pb-6">
        <Accordion
          allowMultiple={false}
          items={[
            {
              key: "addresses",
              title: "آدرس‌ها",
              content: (
                <div className="space-y-4">

                  <h2 className="text-xl font-semibold bg-amber-200 rounded px-3 py-2">
                    آدرس‌ها
                  </h2>

                  <div className="bg-gray-50 border rounded p-3">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">

                      {/* Province %40 */}
                      <div className="md:col-span-2">
                        <ProvinceList />
                      </div>

                      {/* District %60 */}
                      <div className="md:col-span-3">
                        <DistrictList />
                      </div>
                    </div>
                  </div>
                </div>
              ),
            },

            {
              key: "markets",
              title: "مارکیت و طبقه‌ها",
              content: (
                <div className="space-y-4">

                  <h2 className="text-xl font-semibold bg-amber-200 rounded px-3 py-2">
                    مارکیت و طبقه‌ها
                  </h2>

                  <div className="bg-gray-50 border rounded p-3">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">

                      {/* Market %40 */}
                      <div className="md:col-span-2">
                        <MarketList />
                      </div>

                      {/* Floor %60 */}
                      <div className="md:col-span-3">
                        <FloorList />
                      </div>

                    </div>
                  </div>
                </div>
              ),
            },
            {
              key: "franchise",
              title: "ریزرف سهم مارکیت و مصرق برق",
              content: (
                <div className="space-y-4">

                  <h2 className="text-xl font-semibold bg-amber-200 rounded px-3 py-2">
                    سهم مارکیت و مصرف برق
                  </h2>

                  <div className="bg-gray-50 border rounded p-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                      {/* Market %40 */}
                      <div className="md:col-span-2">
                        <SingleRateList />
                      </div>

                      {/* Floor %60 */}
                      {/* <div className="md:col-span-1">
                        <FloorList />
                      </div> */}

                    </div>
                  </div>
                </div>
              ),
            },
            {
              key: "owner",
              title: "تقسیمات سهم مالک",
              content: (
                <div className="space-y-4">

                  <h2 className="text-xl font-semibold bg-amber-200 rounded px-3 py-2">
                    سهم مالک
                  </h2>

                  <div className="bg-gray-50 border rounded p-3">
                    <div className="grid grid-cols-1 gap-3">
                      <OwnerShareList />
                    </div>
                  </div>
                </div>
              ),
            }


          ]}
        />
      </main>
    </div>
  );
}
