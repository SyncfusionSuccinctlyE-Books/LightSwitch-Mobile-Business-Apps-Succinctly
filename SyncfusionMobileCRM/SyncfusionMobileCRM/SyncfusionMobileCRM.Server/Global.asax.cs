using System;
using System.Web.Http;
using System.Web.Routing;

namespace LightSwitchApplication
{
    public class Global : System.Web.HttpApplication
    {
        protected void Application_Start(object sender, EventArgs e)
        {  
            RouteTable.Routes.MapHttpRoute(
               name: "ReportsApi",
               routeTemplate: "reports/{controller}/{id}"
               );
        }
    }
}
