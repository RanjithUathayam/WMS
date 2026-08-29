import { Component, OnInit } from '@angular/core';
import { ApiService } from '../service/api.service';
import { Router } from '@angular/router';
import { DataService } from '../service/data.service'; 
import { AppComponent } from '../app.component';
import { SwalService } from '../service/swal.service';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {

    chartData: any = {};
    locationChartData: any = [];
    chartLoading: boolean = true;

    chartOptionsPie: any = {
        series: [0, 0, 0, 0],
        chart: {
            width: 400,
            type: 'pie',
        },
        labels: ["Occupied", "Free", "Error With Pallet", "Error Without Pallet"],
        responsive: [
            {
                breakpoint: 480,
                options: {
                    chart: {
                        width: 200
                    },
                    legend: {
                        position: "bottom"
                    }
                }
            },
            {
                breakpoint: 1025,
                options: {
                    chart: {
                        width: 300,
                        height: 220
                    },
                    legend: {
                        position: "bottom"
                    }
                }
            } 
        ]
    };

    chartOptionsPie1: any = {
        series: [0, 0, 0],
        chart: {
            width: 400,
            type: 'pie',
        },
        labels: ["Fully Occupied", "Partially Occupied", "Free"],
        responsive: [
            {
                breakpoint: 480,
                options: {
                    chart: {
                        width: 200
                    },
                    legend: {
                        position: "bottom"
                    }
                }
            }
        ]
    };

    chartOptionsBar: any ={
        chart: {
          type: 'bar',
          height: 350
        },
        series: [{
          name: 'Number of Orders',
          data: []
        }],
        xaxis: {
          categories: [],
          title: {
            text: 'Order Date'
          }
        },
        yaxis: {
          title: {
            text: 'Number of Orders'
          }
        },
        responsive: [{
          breakpoint: 480,
          options: {
            chart: {
              height: 220
            },
            xaxis: {
              labels: {
                rotate: -45
              }
            }
          }
        }]
    };

    chartOptionsBarItem: any ={
        chart: {
          type: 'bar',
          height: 350
        },
        series: [{
          name: 'Items Picked',
          data: []
        }],
        xaxis: {
          categories: [],
          title: {
            text: 'Order Date'
          }
        },
        yaxis: {
          title: {
            text: 'Items Picked'
          }
        },
        responsive: [{
          breakpoint: 480,
          options: {
            chart: {
              height: 220
            },
            xaxis: {
              labels: {
                rotate: -45
              }
            }
          }
        }]
    };

    alarmList: any = [];

    constructor(
        private apiservice: ApiService, 
        private router: Router, 
        private dataService: DataService, 
        private appComponent: AppComponent, 
        private swal: SwalService
    ) { }

    ngOnInit(): void { 
        this.getdashboardData(); 
        this.adjustChartDimensions(window.innerWidth);

        // Listen to window resize events
        window.addEventListener('resize', () => {
            this.adjustChartDimensions(window.innerWidth);
        });
    }

    adjustChartDimensions(width: number) {
        // Define proportional values for width and height based on the viewport size
        let chartWidth = Math.max(50, width * 0.3);   
        let chartHeight = Math.max(50, width * 0.13); 
        let chartWidthPie = Math.max(50, width * 0.3);
        let chartHeightPie = Math.max(50, width * 0.13);
    
        if (width <= 768) {
            chartWidth = Math.max(100, width * 0.7); 
            chartHeight = Math.max(200, width * 0.3);  
        } else if (width <= 1024) {
            chartWidth = Math.max(100, width * 0.3); 
            chartWidthPie = Math.max(100, width * 0.35);
            chartHeightPie = Math.max(100, width * 0.2);
            chartHeight = Math.max(100, width * 0.16);  
        }
    
        // Update chart dimensions
        this.chartOptionsPie = {
            ...this.chartOptionsPie,
            chart: {
                ...this.chartOptionsPie.chart,
                width: chartWidthPie,
                height: chartHeightPie,
                toolbar: {
                    // show: true,
                    tools: {
                        // download: true,
                    },
                }
            }, 
        };
        
        this.chartOptionsPie1 = {
            ...this.chartOptionsPie1,
            chart: {
                ...this.chartOptionsPie1.chart,
                width: chartWidth,
                height: chartHeight,
                toolbar: {
                    show: true,
                    tools: {
                        download: true,
                    },
                }
            },
        };
    }

    getdashboardData() {

        this.alarmList = [];
        this.appComponent.showLoading('Dashboard Loading...');
        this.apiservice.dashboardData().subscribe((res: any) => {
            if(res.status == 0) {
                this.appComponent.hideLoading();
                this.chartLoading = true; 
                return;
            }
            if (res.status == 1) {
                this.appComponent.hideLoading();
                this.alarmList = res?.alarmStatusList?.rows;
                this.chartData = res?.chartResult[0];

                this.prepareItemChartData(res?.OrderDetails)
                this.prepareOrderChartData(res?.OrderDetails)
                this.locationChartData = [
                    this.chartData.OccupiedPalletLoc, 
                    this.chartData.FreeLoc, 
                    this.chartData.ErrorLocWPallet, 
                    this.chartData.ErrorLocWOPallet
                ];

                const pieChart2Data = [
                    this.chartData.FullBay, 
                    this.chartData.PartialBay, 
                    this.chartData.FreeBayCounts
                ];

                this.chartOptionsPie.series = this.locationChartData;
                this.chartOptionsPie.labels = [`Occupied(${this.chartData.OccupiedPalletLoc})`, `Free(${this.chartData.FreeLoc})`, `Error With Bin(${this.chartData.ErrorLocWPallet})`, `Error Without Bin(${this.chartData.ErrorLocWOPallet})`];
                this.chartOptionsPie1.series = pieChart2Data;
                this.chartOptionsPie1.labels = [`Full Bay(${this.chartData.FullBay})`, `Partial Bay(${this.chartData.PartialBay})`, `Free Bay(${this.chartData.FreeBayCounts})`];
                this.chartLoading = false;
            }
        }, (err: any) => { 
            this.appComponent.hideLoading();
            this.swal.error('Error1', err.message);
        });
    }

    // prepareOrderChartData(data: any[]) {
    //     console.log(data);
    //     const dates = data.map((item) => item.OrderDate);
    //     const orders = data.map((item) => item.NumberOfOrders);
    
    //     this.chartOptionsBar = {
    //       chart: {
    //         type: 'bar',
    //         height: 350
    //       },
    //       series: [{
    //         name: 'Number of Orders',
    //         data: orders
    //       }],
    //       xaxis: {
    //         categories: dates,
    //         title: {
    //           text: 'Order Date'
    //         }
    //       },
    //       yaxis: {
    //         title: {
    //           text: 'Number of Orders'
    //         }
    //       },
    //       responsive: [{
    //         breakpoint: 600,
    //         options: {
    //           chart: {
    //             height: 300
    //           },
    //           xaxis: {
    //             labels: {
    //               rotate: -45
    //             }
    //           }
    //         }
    //       }]
    //     };
    // }

    prepareOrderChartData(data: any[]) {
      const dates = data.map((item) => item.OrderDate);
      const orders = data.map((item) => item.NumberOfOrders);
    
      this.chartOptionsBar = {
        chart: {
          type: 'bar',
          height: 280, // Default height
          width: '200%' // Increased width
        },
        series: [{
          name: 'Number of Orders',
          data: orders
        }],
        xaxis: {
          categories: dates,
          title: {
            text: 'Order Date'
          }
        },
        yaxis: {
          title: {
            text: 'Number of Orders'
          }
        },
        responsive: [
          {
            breakpoint: 1025, // For tablets & smaller desktops
            options: {
              chart: {
                height: 220 // Slightly reduced height
              }
            }
          },
          {
            breakpoint: 768, // For smaller tablets
            options: {
              chart: {
                height: 180 // Further reduced height
              },
              xaxis: {
                labels: {
                  rotate: -45
                }
              }
            }
          },
          {
            breakpoint: 600, // For mobile screens
            options: {
              chart: {
                height: 150, // Further reduced height
                width: '100%'
              },
              xaxis: {
                labels: {
                  rotate: -45
                }
              }
            }
          }
        ]
      };
    }

     prepareItemChartData(data: any[]) {
      const dates = data.map((item) => item.OrderDate);
      const orders = data.map((item) => item.SumOfPickingQuantity);
    
      this.chartOptionsBarItem = {
        chart: {
          type: 'bar',
          height: 280, // Default height
          width: '200%' // Increased width
        },
        series: [{
          name: 'Items Picked',
          data: orders
        }],
        xaxis: {
          categories: dates,
          title: {
            text: 'Order Date'
          }
        },
        yaxis: {
          title: {
            text: 'Items Picked'
          }
        },
        responsive: [
          {
            breakpoint: 1025, // For tablets & smaller desktops
            options: {
              chart: {
                height: 220 // Slightly reduced height
              }
            }
          },
          {
            breakpoint: 768, // For smaller tablets
            options: {
              chart: {
                height: 180 // Further reduced height
              },
              xaxis: {
                labels: {
                  rotate: -45
                }
              }
            }
          },
          {
            breakpoint: 600, // For mobile screens
            options: {
              chart: {
                height: 150, // Further reduced height
                width: '100%'
              },
              xaxis: {
                labels: {
                  rotate: -45
                }
              }
            }
          }
        ]
      };
    }
    
  
    printDiv() {
        const content = document.getElementById('contentToPrint')?.innerHTML;
        const newWindow = window.open();
        newWindow.document.write('<html><head><title>Print</title></head><body>' + content + '</body></html>');
        newWindow.document.close();
        newWindow.print();
    }

    tvDisplayPage() {
        this.router.navigateByUrl('/mainpage/tvDisplay');
    }
}
