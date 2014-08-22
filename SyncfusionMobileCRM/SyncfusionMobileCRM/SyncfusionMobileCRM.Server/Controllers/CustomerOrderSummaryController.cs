using System.Linq;
using System.Web.Http;
using Microsoft.LightSwitch;

namespace LightSwitchApplication.Controllers
{
    public class CustomerOrderSummaryController : ApiController
    {
        public object Get(int id)
        {
            using (ServerApplicationContext context = ServerApplicationContext.CreateContext())
            {
                var query = context.DataWorkspace.ApplicationData.Orders
                    .Where(o => o.Customer.Id == id)
                    .GroupBy(o => o.CreationDate.Year)
                    .Select(g => new
                    {
                        Label = g.Key,
                        Value = g.Sum(o => o.OrderTotal)
                    })
                    .OrderBy(g => g.Label);

                return query.Execute().Select(
                    g => new
                    {
                        Label = string.Format("'{0}", (g.Label - 2000)),
                        Value = g.Value
                    }
                    ).ToArray();
            }
        }
    }
}
